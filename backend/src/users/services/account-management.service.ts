import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, MoreThanOrEqual, Repository } from 'typeorm'
import * as argon2 from 'argon2'
import { randomBytes } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { User } from '../../modules/auth/entities/user.entity.js'
import { Role } from '../../modules/auth/enums/role.enum.js'
import { UserStatus } from '../../modules/auth/enums/user-status.enum.js'
import { KycStatus } from '../../modules/auth/enums/kyc-status.enum.js'
import { KybStatus } from '../../modules/auth/enums/kyb-status.enum.js'
import { KycDocument } from '../../modules/auth/entities/kyc-document.entity.js'
import { KybDocument } from '../../modules/auth/entities/kyb-document.entity.js'
import { Wallet } from '../../modules/auth/entities/wallet.entity.js'
import { Transaction } from '../../modules/auth/entities/transaction.entity.js'
import { FraudAlert } from '../../modules/auth/entities/fraud-alert.entity.js'
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js'
import { PasswordResetToken } from '../../modules/auth/entities/password-reset-token.entity.js'
import { PaymentMethod } from '../../modules/auth/entities/payment-method.entity.js'
import { DeviceFingerprint } from '../../modules/auth/entities/device-fingerprint.entity.js'
import { OtpCode } from '../../modules/auth/entities/otp-code.entity.js'
import { LoginAttempt } from '../../modules/auth/entities/login-attempt.entity.js'
import { Profile } from '../../modules/auth/entities/profile.entity.js'
import { Notification } from '../../notifications/entities/notification.entity.js'
import { AuditLog } from '../../security/entities/audit-log.entity.js'
import { TransactionStatus } from '../../modules/auth/enums/transaction-status.enum.js'
import { WalletStatus } from '../../modules/auth/enums/wallet-status.enum.js'
import { NotificationService } from '../../notifications/services/notification.service.js'
import { StripeSetupService } from '../../modules/auth/services/stripe-setup.service.js'

const REACTIVATION_DEADLINE_DAYS = 30
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const DELETION_CLEANUP_INTERVAL_MS = 60 * 1000

@Injectable()
export class AccountManagementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountManagementService.name)
  private cleanupTimer: NodeJS.Timeout | undefined
  private cleanupPromise: Promise<void> | undefined

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KycDocument)
    private kycRepository: Repository<KycDocument>,
    @InjectRepository(KybDocument)
    private kybRepository: Repository<KybDocument>,
    private notificationService: NotificationService,
    private stripeSetupService: StripeSetupService,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      this.startExpiredDeletionCleanup()
    }, DELETION_CLEANUP_INTERVAL_MS)
    this.cleanupTimer.unref()
    this.startExpiredDeletionCleanup()
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    await this.cleanupPromise
  }

  private startExpiredDeletionCleanup() {
    if (this.cleanupPromise) return
    const cleanup = this.runExpiredDeletionCleanup()
    this.cleanupPromise = cleanup.finally(() => {
      this.cleanupPromise = undefined
    })
  }

  async suspendUser(userId: number, reason: string, adminId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.role === Role.ADMIN && adminId === userId) {
      throw new ForbiddenException('Vous ne pouvez pas vous suspendre vous-même')
    }
    user.accountStatus = UserStatus.SUSPENDED
    user.suspensionReason = reason
    user.suspendedAt = new Date()
    const saved = await this.userRepository.save(user)
    await this.notificationService.create(
      userId,
      'Compte suspendu',
      `Votre compte a été suspendu. Raison : ${reason}. Vous avez 30 jours pour revalider votre KYC/KYB pour réactiver votre compte.`,
    )
    return saved
  }

  async reactivateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.accountStatus !== UserStatus.SUSPENDED) {
      throw new BadRequestException('Ce compte n\'est pas suspendu')
    }
    user.accountStatus = UserStatus.ACTIVE
    user.suspensionReason = null
    user.suspendedAt = null
    user.revalidatedAt = new Date()
    return this.userRepository.save(user)
  }

  async requestOwnDeletion(userId: number, password: string) {
    return this.scheduleDeletion(userId, userId, password)
  }

  async softDeleteUser(userId: number, adminId: number) {
    return this.scheduleDeletion(userId, adminId)
  }

  private async scheduleDeletion(userId: number, requesterId: number, password?: string) {
    return this.userRepository.manager.transaction(async (manager) => {
      const users = manager.getRepository(User)
      const user = await users.findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } })
      if (!user) throw new NotFoundException('Utilisateur non trouvé')
      if (user.role === Role.ADMIN && requesterId === userId) {
        const activeAdminCount = await users.count({ where: { role: Role.ADMIN, accountStatus: UserStatus.ACTIVE } })
        if (activeAdminCount <= 1) {
          throw new ForbiddenException('Un dernier administrateur actif doit être conservé')
        }
      }
      if (user.accountStatus === UserStatus.DELETED) {
        throw new BadRequestException('Ce compte ne peut pas commencer une nouvelle suppression')
      }
      if (password && !(await argon2.verify(user.passwordHash, password))) {
        throw new ForbiddenException('Mot de passe incorrect')
      }

      const blockers = await this.getDeletionBlockers(manager, userId)
      const adminUsers = await users.find({
        where: { role: Role.ADMIN, accountStatus: UserStatus.ACTIVE },
        select: { id: true },
      })
      const notifications = manager.getRepository(Notification)
      const now = new Date()
      const deadline = new Date(now.getTime() + REACTIVATION_DEADLINE_DAYS * DAY_IN_MILLISECONDS)
      const notificationMessage = blockers.length > 0
        ? `La demande de suppression de l'utilisateur #${userId} est bloquée : ${blockers.join('; ')}`
        : `L'utilisateur #${userId} a demandé la suppression de son compte. Échéance : ${deadline.toISOString()}.`

      if (blockers.length > 0) {
        await notifications.save(adminUsers.map((admin) => notifications.create({
          userId: admin.id,
          title: 'Demande de suppression à examiner',
          message: notificationMessage,
          link: `/admin/users/${userId}`,
        })))
        return { status: 'blocked' as const, message: 'La vérification de sécurité bloque la demande.', reasons: blockers }
      }

      user.deletionPreviousStatus = user.accountStatus
      user.accountStatus = UserStatus.DELETED
      user.deletedAt = now
      user.reactivationDeadline = deadline
      await users.save(user)
      await manager.getRepository(RefreshToken).delete({ userId })
      await notifications.save([
        notifications.create({
          userId,
          title: 'Suppression du compte programmée',
          message: `Votre compte est bloqué. Vous pouvez l'annuler avec votre email et votre mot de passe avant le ${deadline.toISOString()}.`,
        }),
        ...adminUsers.map((admin) => notifications.create({
          userId: admin.id,
          title: 'Demande de suppression du compte',
          message: notificationMessage,
          link: `/admin/users/${userId}`,
        })),
      ])

      return {
        status: 'scheduled' as const,
        message: 'La suppression est programmée. Le compte est bloqué immédiatement.',
        reactivationDeadline: deadline,
      }
    })
  }

  private async getDeletionBlockers(manager: EntityManager, userId: number): Promise<string[]> {
    const wallets = await manager.getRepository(Wallet).find({ where: { userId }, select: { id: true } })
    const alerts = await manager.getRepository(FraudAlert).find({ where: { userId } })
    const openAlerts = alerts.filter((alert) => alert.status === 'OPEN')
    const reasons = openAlerts.map((alert) => `Alerte de fraude non résolue (#${alert.id})`)
    const walletIds = wallets.map((wallet) => wallet.id)
    if (walletIds.length === 0) return reasons

    const activeTransactions = await manager.getRepository(Transaction).find({
      where: [
        { senderWalletId: In(walletIds), status: In([TransactionStatus.PENDING, TransactionStatus.PROCESSING]) },
        { recipientWalletId: In(walletIds), status: In([TransactionStatus.PENDING, TransactionStatus.PROCESSING]) },
      ],
    })
    if (activeTransactions.length > 0) {
      reasons.push(`${activeTransactions.length} opération(s) en cours`)
    }

    const highRiskTransactions = await manager.getRepository(Transaction).find({
      where: [
        { senderWalletId: In(walletIds), riskScore: MoreThanOrEqual(70) },
        { recipientWalletId: In(walletIds), riskScore: MoreThanOrEqual(70) },
      ],
    })
    const resolvedTransactionIds = new Set(
      alerts.filter((alert) => alert.status === 'RESOLVED').map((alert) => alert.transactionId),
    )
    const unresolvedHighRiskCount = highRiskTransactions.filter(
      (transaction) => !resolvedTransactionIds.has(transaction.id),
    ).length
    if (unresolvedHighRiskCount > 0) {
      reasons.push(`${unresolvedHighRiskCount} transaction(s) avec un score IA de risque élevé à examiner`)
    }
    return reasons
  }

  async permanentlyDeleteUser(userId: number, adminId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.role === Role.ADMIN && adminId === userId) {
      throw new ForbiddenException('Vous ne pouvez pas vous supprimer vous-même')
    }
    if (user.accountStatus !== UserStatus.DELETED) {
      throw new BadRequestException('Ce compte n\'est pas en cours de suppression')
    }
    if (!user.reactivationDeadline || new Date() < user.reactivationDeadline) {
      throw new BadRequestException('La période de grâce de 30 jours n\'est pas encore écoulée')
    }
    const anonymized = await this.anonymizeUser(userId, new Date())
    if (!anonymized) throw new BadRequestException('La période de grâce de 30 jours n\'est pas encore écoulée')
    return { message: 'Compte anonymisé définitivement ; les écritures financières sont conservées.' }
  }

  async cancelDeletion(userId: number, _adminId: number): Promise<User> {
    return this.userRepository.manager.transaction(async (manager) => {
      const users = manager.getRepository(User)
      const user = await users.findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } })
      if (!user) throw new ForbiddenException('Utilisateur non trouvé')
      if (user.accountStatus !== UserStatus.DELETED) {
        throw new BadRequestException('Ce compte n\'est pas en cours de suppression')
      }
      if (!user.reactivationDeadline || new Date() >= user.reactivationDeadline) {
        throw new BadRequestException('La période de grâce de 30 jours est expirée')
      }
      user.accountStatus = user.deletionPreviousStatus ?? UserStatus.ACTIVE
      user.deletionPreviousStatus = null
      user.deletedAt = null
      user.reactivationDeadline = null
      if (user.accountStatus !== UserStatus.SUSPENDED) {
        user.suspensionReason = null
        user.suspendedAt = null
      }
      return users.save(user)
    })
  }

  async revalidateAccount(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.accountStatus !== UserStatus.DELETED) {
      throw new BadRequestException('Ce compte ne nécessite pas de révalidation')
    }
    if (!user.reactivationDeadline || new Date() >= user.reactivationDeadline) {
      throw new BadRequestException('La période de révalidation de 30 jours est expirée')
    }
    user.accountStatus = user.deletionPreviousStatus ?? UserStatus.ACTIVE
    user.deletionPreviousStatus = null
    user.deletedAt = null
    user.reactivationDeadline = null
    if (user.accountStatus !== UserStatus.SUSPENDED) {
      user.suspensionReason = null
      user.suspendedAt = null
      user.kycStatus = KycStatus.NON_VERIFIE
      user.kybStatus = KybStatus.NON_VERIFIE
      await this.kycRepository.update({ userId }, { status: KycStatus.NON_VERIFIE })
      await this.kybRepository.update({ userId }, { status: KybStatus.NON_VERIFIE })
    }
    return this.userRepository.save(user)
  }

  async resetKyc(userId: number, _isAdmin = false): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    await this.kycRepository.update({ userId }, { status: KycStatus.NON_VERIFIE })
    user.kycStatus = KycStatus.NON_VERIFIE
    await this.userRepository.save(user)
    await this.notificationService.create(
      userId,
      'KYC réinitialisé',
      'Votre demande KYC a été réinitialisée. Vous pouvez soumettre de nouveaux documents.',
    )
    return { message: 'KYC réinitialisé' }
  }

  async resetKyb(userId: number, _isAdmin = false): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    await this.kybRepository.update({ userId }, { status: KybStatus.NON_VERIFIE })
    user.kybStatus = KybStatus.NON_VERIFIE
    await this.userRepository.save(user)
    await this.notificationService.create(
      userId,
      'KYB réinitialisé',
      'Votre demande KYB a été réinitialisée. Vous pouvez soumettre de nouveaux documents.',
    )
    return { message: 'KYB réinitialisé' }
  }

  async checkExpiredDeletions(): Promise<number> {
    const now = new Date()
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.accountStatus = :status', { status: UserStatus.DELETED })
      .andWhere('user.reactivationDeadline <= :now', { now })
      .getRawMany<{ id: number }>()

    let anonymizedCount = 0
    for (const { id } of users) {
      if (await this.anonymizeUser(id, now)) anonymizedCount += 1
    }
    return anonymizedCount
  }

  private async anonymizeUser(userId: number, now: Date): Promise<boolean> {
    return this.userRepository.manager.transaction(async (manager) => {
      const users = manager.getRepository(User)
      const user = await users.findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } })
      if (
        !user
        || user.accountStatus !== UserStatus.DELETED
        || !user.reactivationDeadline
        || user.reactivationDeadline > now
      ) return false

      const kycDocuments = await manager.getRepository(KycDocument).find({ where: { userId } })
      const kybDocuments = await manager.getRepository(KybDocument).find({ where: { userId } })
      const wallets = await manager.getRepository(Wallet).find({ where: { userId } })
      const walletIds = wallets.map((wallet) => wallet.id)
      await Promise.all([
        ...kycDocuments.map((document) => this.removeUploadedFile(document.documentUrl)),
        ...kybDocuments.map((document) => this.removeUploadedFile(document.documentUrl)),
        this.removeUploadedFile(user.avatarUrl),
      ])

      const profiles = manager.getRepository(Profile)
      await profiles.update({ userId }, {
        address: null,
        city: null,
        country: null,
        postalCode: null,
        idNumber: null,
        idType: null,
        idExpiryDate: null,
        companyName: null,
        sirenNif: null,
        tradeRegister: null,
        companyAddress: null,
        companyRib: null,
        metadata: null,
      })
      await manager.getRepository(KycDocument).delete({ userId })
      await manager.getRepository(KybDocument).delete({ userId })
      const paymentMethods = await manager.getRepository(PaymentMethod).find({
        where: { userId },
        select: { stripeCustomerId: true },
      })
      const stripeCustomerIds = [...new Set(
        paymentMethods.map(({ stripeCustomerId }) => stripeCustomerId).filter((id): id is string => Boolean(id)),
      )]
      for (const customerId of stripeCustomerIds) {
        await this.stripeSetupService.deleteCustomer(customerId)
      }
      await manager.getRepository(PaymentMethod).delete({ userId })
      await manager.getRepository(DeviceFingerprint).delete({ userId })
      await manager.getRepository(OtpCode).delete({ userId })
      await manager.getRepository(PasswordResetToken).delete({ userId })
      await manager.getRepository(RefreshToken).delete({ userId })
      await manager.getRepository(Notification).delete({ userId })
      await manager.getRepository(LoginAttempt).delete({ email: user.email })
      await manager.getRepository(AuditLog).update({ userId }, { ipAddress: null, userAgent: null })

      if (walletIds.length > 0) {
        const senderTransactions = await manager.getRepository(Transaction).find({
          where: { senderWalletId: In(walletIds) },
        })
        const privateMetadataKeys = ['cardToken', 'deviceId', 'ipAddress', 'twoFactorCodeHash', 'twoFactorExpiresAt']
        for (const transaction of senderTransactions) {
          const metadata = { ...transaction.metadata }
          for (const key of privateMetadataKeys) delete metadata[key]
          transaction.metadata = metadata
        }
        await manager.getRepository(Transaction).save(senderTransactions)
      }

      const wallet = wallets[0]
      if (wallet) {
        wallet.status = WalletStatus.CLOSED
        wallet.cardNumber = `9999${String(userId).padStart(12, '0')}`
        wallet.cardHolderName = 'SUPPRIMÉ'
        wallet.metadata = null
        await manager.getRepository(Wallet).save(wallet)
      }

      user.email = `deleted-${userId}@deleted.invalid`
      user.passwordHash = await argon2.hash(randomBytes(32).toString('hex'))
      user.firstName = ''
      user.lastName = ''
      user.cin = null
      user.phone = null
      user.dateOfBirth = null
      user.avatarUrl = null
      user.accountStatus = UserStatus.DELETED
      user.reactivationDeadline = null
      user.deletionPreviousStatus = null
      user.deletedAt = now
      user.isEmailVerified = false
      user.isTwoFactorEnabled = false
      user.twoFactorSecret = null
      user.securityMetadata = null
      user.suspensionReason = null
      user.suspendedAt = null
      user.accountExpiresAt = null
      await users.save(user)
      return true
    })
  }

  private async removeUploadedFile(url: string | null) {
    const match = url && /^\/uploads\/([^/\\]+)$/.exec(url)
    if (!match) return
    const filename = basename(match[1])
    try {
      await unlink(resolve(process.cwd(), 'uploads', filename))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  private async runExpiredDeletionCleanup() {
    try {
      const count = await this.checkExpiredDeletions()
      if (count > 0) this.logger.log(`Anonymized ${count} expired account deletion(s).`)
    } catch (error) {
      this.logger.error('Automatic account-deletion cleanup failed.', error instanceof Error ? error.stack : String(error))
    }
  }

  async updateUserAvatar(userId: number, filename: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé')
    }
    user.avatarUrl = `/uploads/${filename}`
    return this.userRepository.save(user)
  }

  async clearUserAvatar(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé')
    }
    user.avatarUrl = null
    return this.userRepository.save(user)
  }
}