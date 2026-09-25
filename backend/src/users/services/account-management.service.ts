import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../modules/auth/entities/user.entity.js'
import { Role } from '../../modules/auth/enums/role.enum.js'
import { UserStatus } from '../../modules/auth/enums/user-status.enum.js'
import { KycStatus } from '../../modules/auth/enums/kyc-status.enum.js'
import { KybStatus } from '../../modules/auth/enums/kyb-status.enum.js'
import { KycDocument } from '../../modules/auth/entities/kyc-document.entity.js'
import { KybDocument } from '../../modules/auth/entities/kyb-document.entity.js'
import { NotificationService } from '../../notifications/services/notification.service.js'

const REACTIVATION_DEADLINE_DAYS = 30

@Injectable()
export class AccountManagementService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KycDocument)
    private kycRepository: Repository<KycDocument>,
    @InjectRepository(KybDocument)
    private kybRepository: Repository<KybDocument>,
    private notificationService: NotificationService,
  ) {}

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

  async softDeleteUser(userId: number, adminId: number): Promise<{ message: string; reactivationDeadline: Date }> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.role === Role.ADMIN && adminId === userId) {
      throw new ForbiddenException('Vous ne pouvez pas vous supprimer vous-même')
    }
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + REACTIVATION_DEADLINE_DAYS)
    user.accountStatus = UserStatus.DELETED
    user.deletedAt = new Date()
    user.reactivationDeadline = deadline
    await this.userRepository.save(user)
    await this.notificationService.create(
      userId,
      'Compte supprimé',
      `Votre compte a été supprimé. Vous avez jusqu'au ${deadline.toLocaleDateString('fr-FR')} pour contacter le support et réactiver votre compte.`,
    )
    return { message: 'Utilisateur supprimé avec succès', reactivationDeadline: deadline }
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
    if (!user.reactivationDeadline || new Date() <= user.reactivationDeadline) {
      throw new BadRequestException('La période de grâce de 30 jours n\'est pas encore écoulée')
    }
    await this.userRepository.remove(user)
    return { message: 'Utilisateur définitivement supprimé' }
  }

  async cancelDeletion(userId: number, adminId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.accountStatus !== UserStatus.DELETED) {
      throw new BadRequestException('Ce compte n\'est pas en cours de suppression')
    }
    user.accountStatus = UserStatus.ACTIVE
    user.deletedAt = null
    user.reactivationDeadline = null
    user.suspensionReason = null
    user.suspendedAt = null
    return this.userRepository.save(user)
  }

  async revalidateAccount(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new ForbiddenException('Utilisateur non trouvé')
    }
    if (user.accountStatus !== UserStatus.DELETED) {
      throw new BadRequestException('Ce compte ne nécessite pas de révalidation')
    }
    if (!user.reactivationDeadline || new Date() > user.reactivationDeadline) {
      throw new BadRequestException('La période de révalidation de 30 jours est expirée')
    }
    user.accountStatus = UserStatus.ACTIVE
    user.deletedAt = null
    user.reactivationDeadline = null
    user.kycStatus = KycStatus.NON_VERIFIE
    user.kybStatus = KybStatus.NON_VERIFIE
    await this.kycRepository.update({ userId }, { status: KycStatus.NON_VERIFIE })
    await this.kybRepository.update({ userId }, { status: KybStatus.NON_VERIFIE })
    return this.userRepository.save(user)
  }

  async resetKyc(userId: number, isAdmin = false): Promise<{ message: string }> {
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

  async resetKyb(userId: number, isAdmin = false): Promise<{ message: string }> {
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
    const result = await this.userRepository
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('account_status = :status AND reactivationDeadline < :now', {
        status: UserStatus.DELETED,
        now,
      })
      .execute()
    return result.affected || 0
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