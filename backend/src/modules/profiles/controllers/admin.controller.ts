import { Controller, Get, UseGuards, Param, Patch, Body, Req, Post, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, NotFoundException, ParseIntPipe } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Not, Repository } from 'typeorm'
import { RolesGuard } from '../../../common/guards/roles.guard.js'
import { UsersService } from '../../../users/services/users.service.js'
import { Role } from '../../auth/enums/role.enum.js'
import { UserStatus } from '../../auth/enums/user-status.enum.js'
import { Roles } from '../../auth/controllers/auth.controller.js'
import { KycService } from '../services/kyc.service.js'
import { KybService } from '../services/kyb.service.js'
import { ReviewKycDocumentDto } from '../../auth/dto/kyc.dto.js'
import { ReviewKybDocumentDto } from '../../auth/dto/kyb.dto.js'
import { AccountManagementService } from '../../../users/services/account-management.service.js'
import { imageFileFilter, storage } from '../../../storage/storage.config.js'
import { Transaction } from '../../auth/entities/transaction.entity.js'
import { FraudAlert } from '../../auth/entities/fraud-alert.entity.js'
import type { FraudOutcome } from '../../auth/entities/fraud-alert.entity.js'
import { SecurityRule } from '../../auth/entities/security-rule.entity.js'
import { AuditLog } from '../../../security/entities/audit-log.entity.js'

interface RequestWithUser {
  user: { sub: string; email: string; role: string }
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private kycService: KycService,
    private kybService: KybService,
    private accountManagementService: AccountManagementService,
    @InjectRepository(Transaction) private transactionRepository: Repository<Transaction>,
    @InjectRepository(FraudAlert) private fraudAlertRepository: Repository<FraudAlert>,
    @InjectRepository(SecurityRule) private securityRuleRepository: Repository<SecurityRule>,
    @InjectRepository(AuditLog) private auditLogRepository: Repository<AuditLog>,
  ) {}

  @Get('security-rules')
  getSecurityRules() {
    return this.securityRuleRepository.find({ order: { priority: 'DESC', updatedAt: 'DESC' } })
  }

  @Get('audit-logs')
  async getAuditLogs(@Query('page') pageValue = '1') {
    const requestedPage = Number(pageValue)
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
      throw new BadRequestException('Le numéro de page doit être un entier positif')
    }
    const limit = 10
    const total = await this.auditLogRepository.count()
    const totalPages = Math.ceil(total / limit)
    const page = Math.min(requestedPage, Math.max(totalPages, 1))
    const logs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    const items = await Promise.all(logs.map(async (log) => ({
      ...log,
      user: log.userId ? await this.usersService.findById(log.userId).catch(() => null) : null,
    })))
    return { items, total, page, limit, totalPages }
  }

  @Post('security-rules')
  async createSecurityRule(@Body() body: Partial<SecurityRule>) {
    return this.securityRuleRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(SecurityRule)
      const rule = repository.create({
        ruleName: body.ruleName ?? 'Nouvelle règle',
        ruleType: body.ruleType ?? 'FRAUD',
        conditions: body.conditions ?? {},
        actions: body.actions ?? {},
        isActive: body.isActive ?? true,
        priority: body.priority ?? 0,
        description: body.description ?? null,
      })
      if (rule.isActive) {
        await repository.update({ ruleType: rule.ruleType, isActive: true }, { isActive: false })
      }
      return repository.save(rule)
    })
  }

  @Patch('security-rules/:id')
  async updateSecurityRule(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<SecurityRule>) {
    return this.securityRuleRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(SecurityRule)
      const rule = await repository.findOneBy({ id })
      if (!rule) throw new BadRequestException('Règle de sécurité introuvable')
      const { ruleName, ruleType, conditions, actions, isActive, priority, description } = body
      if (ruleName !== undefined) rule.ruleName = ruleName
      if (ruleType !== undefined) rule.ruleType = ruleType
      if (conditions !== undefined) rule.conditions = conditions
      if (actions !== undefined) rule.actions = actions
      if (isActive !== undefined) rule.isActive = isActive
      if (priority !== undefined) rule.priority = priority
      if (description !== undefined) rule.description = description
      if (rule.isActive) {
        await repository.update(
          { ruleType: rule.ruleType, isActive: true, id: Not(rule.id) },
          { isActive: false },
        )
      }
      return repository.save(rule)
    })
  }

  @Delete('security-rules/:id')
  async deleteSecurityRule(@Param('id', ParseIntPipe) id: number) {
    await this.securityRuleRepository.delete(id)
    return { success: true }
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    const user = await this.usersService.findById(parseInt(id))
    return user
  }

  @Get('users')
  async getAllUsers() {
    return this.usersService.findAll()
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: Role }) {
    return this.usersService.updateRole(parseInt(id), body.role)
  }

  @Patch('kyc/:id/review')
  async reviewKyc(@Param('id') id: string, @Body() dto: ReviewKycDocumentDto, @Req() req: RequestWithUser) {
    return this.kycService.review(parseInt(id), parseInt(req.user.sub, 10), dto)
  }

  @Patch('kyb/:id/review')
  async reviewKyb(@Param('id') id: string, @Body() dto: ReviewKybDocumentDto, @Req() req: RequestWithUser) {
    return this.kybService.review(parseInt(id), parseInt(req.user.sub, 10), dto)
  }

  @Patch('users/:id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: RequestWithUser,
  ) {
    return this.accountManagementService.suspendUser(parseInt(id), body.reason, parseInt(req.user.sub, 10))
  }

  @Patch('users/:id/reactivate')
  async reactivateUser(@Param('id') id: string) {
    return this.accountManagementService.reactivateUser(parseInt(id))
  }

  @Delete('users/:id')
  async softDeleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.softDeleteUser(parseInt(id), parseInt(req.user.sub, 10))
  }

  @Delete('users/:id/permanent')
  async permanentlyDeleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.permanentlyDeleteUser(parseInt(id), parseInt(req.user.sub, 10))
  }

  @Patch('users/:id/cancel-deletion')
  async cancelDeletion(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.cancelDeletion(parseInt(id), parseInt(req.user.sub, 10))
  }

  @Post('users/:id/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage, fileFilter: imageFileFilter }))
  async uploadUserAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Une image de profil est requise')
    return this.accountManagementService.updateUserAvatar(parseInt(id), file.filename)
  }

  @Delete('users/:id/avatar')
  async clearUserAvatar(@Param('id') id: string) {
    return this.accountManagementService.clearUserAvatar(parseInt(id))
  }

  @Patch('users/:id/reset-kyc')
  async resetKyc(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.resetKyc(parseInt(id), req.user.role === 'ADMIN')
  }

  @Patch('users/:id/reset-kyb')
  async resetKyb(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.resetKyb(parseInt(id), req.user.role === 'ADMIN')
  }

  @Post('cleanup-expired')
  async cleanupExpiredDeletions() {
    const count = await this.accountManagementService.checkExpiredDeletions()
    return { message: `${count} compte(s) définitivement supprimé(s)` }
  }

  @Get('fraud-alerts')
  async getFraudAlerts(@Query('includeAll') includeAllValue = 'false') {
    const includeAll = includeAllValue === 'true'
    const transactions = await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
      relations: { senderWallet: true, recipientWallet: true },
    })
    const fraudAlerts = await this.fraudAlertRepository.find({
      where: { transactionId: In(transactions.map((transaction) => transaction.id)) },
    })
    const alertByTransaction = new Map(
      fraudAlerts.map((alert) => [alert.transactionId, alert]),
    )

    const alerts = await Promise.all(
      transactions
        .filter((transaction) => {
          const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
          const riskScore = Number(metadata.riskScore ?? metadata.risk_score ?? transaction.riskScore ?? 0)
          const riskDecision = typeof metadata.riskDecision === 'string'
            ? metadata.riskDecision.toUpperCase()
            : null
          const hasFraudFailureReason = typeof transaction.failureReason === 'string'
            && transaction.failureReason.toLowerCase().includes('fraude')
          const needsReview = hasFraudFailureReason
            || (riskDecision ? riskDecision !== 'APPROVE' : Number.isFinite(riskScore) && riskScore >= 30)
          return includeAll || needsReview || alertByTransaction.has(transaction.id)
        })
        .map(async (transaction) => {
          const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
          const senderUser = transaction.senderWallet
            ? await this.usersService.findById(transaction.senderWallet.userId)
            : null
          const recipientUser = transaction.recipientWallet
            ? await this.usersService.findById(transaction.recipientWallet.userId)
            : null

          const riskScore = Number(metadata.riskScore ?? metadata.risk_score ?? transaction.riskScore ?? 0)
          const hasFraudFailureReason = typeof transaction.failureReason === 'string'
            && transaction.failureReason.toLowerCase().includes('fraude')
          const riskLevel = String(metadata.riskLevel ?? metadata.risk_level ?? 'UNKNOWN').toUpperCase()
          const riskDecision = typeof metadata.riskDecision === 'string'
            ? metadata.riskDecision.toUpperCase()
            : null
          const riskReasons = Array.isArray(metadata.riskReasons)
            ? metadata.riskReasons.filter((reason): reason is string => typeof reason === 'string')
            : []
          const contextualReason = riskReasons.find((reason) => !/^(?:risque (?:élevé|intermédiaire|faible)|(?:high|medium|low) risk)\s*:/i.test(reason))
            ?? transaction.failureReason
            ?? riskReasons[0]
            ?? (riskScore >= 70
              ? `Risque élevé : score de ${riskScore.toFixed(1)}/100, transaction bloquée ou soumise à vérification.`
              : riskScore >= 30
                ? `Risque intermédiaire : score de ${riskScore.toFixed(1)}/100, confirmation supplémentaire recommandée.`
                : `Risque faible : montant de ${Number(transaction.amount).toFixed(2)} ${transaction.currency}, aucun signal anormal détecté.`)

          return {
            id: transaction.id,
            transactionId: transaction.id,
            amount: Number(transaction.amount),
            currency: transaction.currency,
            status: transaction.status,
            channel: transaction.channel,
            riskScore: Number.isFinite(riskScore) ? riskScore : 0,
            riskLevel: riskLevel === 'LOW' || riskLevel === 'MEDIUM' || riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
              ? riskLevel.toLowerCase()
              : 'medium',
            reviewStatus: alertByTransaction.get(transaction.id)?.status
              ?? (includeAll
                ? 'OPEN'
                : riskDecision
                ? (riskDecision === 'APPROVE' && !hasFraudFailureReason ? 'RESOLVED' : 'OPEN')
                : (riskScore >= 30 || hasFraudFailureReason ? 'OPEN' : 'RESOLVED')),
            fraudOutcome: alertByTransaction.get(transaction.id)?.fraudOutcome ?? null,
            reason: contextualReason,
            sender: senderUser ? { id: senderUser.id, name: `${senderUser.firstName} ${senderUser.lastName}`.trim() } : null,
            recipient: recipientUser ? { id: recipientUser.id, name: `${recipientUser.firstName} ${recipientUser.lastName}`.trim() } : null,
            createdAt: transaction.createdAt,
          }
        }),
    )

    return alerts
  }

  @Get('fraud-alerts/:id/investigation')
  async getFraudAlertInvestigation(@Param('id', ParseIntPipe) transactionId: number) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: { senderWallet: true, recipientWallet: true },
    })
    if (!transaction?.senderWallet) throw new NotFoundException('Transaction non trouvée')

    const sender = await this.usersService.findById(transaction.senderWallet.userId)
    const alert = await this.fraudAlertRepository.findOne({ where: { transactionId } })
    const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
    const riskReasons = Array.isArray(metadata.riskReasons)
      ? metadata.riskReasons.filter((reason): reason is string => typeof reason === 'string')
      : []
    const recentTransactions = await this.transactionRepository.find({
      where: { senderWalletId: transaction.senderWalletId },
      order: { createdAt: 'DESC' },
      take: 10,
    })

    return {
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        feeAmount: Number(transaction.feeAmount),
        totalAmount: Number(transaction.totalAmount),
        currency: transaction.currency,
        channel: transaction.channel,
        status: transaction.status,
        externalReference: transaction.externalReference,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
      },
      risk: {
        score: Number(metadata.riskScore ?? metadata.risk_score ?? transaction.riskScore ?? 0),
        level: String(metadata.riskLevel ?? metadata.risk_level ?? transaction.riskLevel ?? 'UNKNOWN'),
        decision: typeof metadata.riskDecision === 'string' ? metadata.riskDecision : 'UNKNOWN',
        reasons: riskReasons,
        features: (() => {
          const features = metadata.riskFeatures
          if (!features || typeof features !== 'object') return null
          const safeFeatures = features as Record<string, unknown>
          return {
            model: typeof safeFeatures.model === 'string' ? safeFeatures.model : null,
            amount: typeof safeFeatures.amount === 'number' ? safeFeatures.amount : null,
            transaction_count_24h: typeof safeFeatures.transaction_count_24h === 'number'
              ? safeFeatures.transaction_count_24h
              : null,
            hour: typeof safeFeatures.hour === 'number' ? safeFeatures.hour : null,
            channel: typeof safeFeatures.channel === 'string' ? safeFeatures.channel : null,
          }
        })(),
      },
      review: alert
        ? {
          status: alert.status,
          adminNotes: alert.adminNotes,
          reviewedAt: alert.reviewedAt,
          fraudOutcome: alert.fraudOutcome,
        }
        : null,
      sender: {
        id: sender.id,
        name: `${sender.firstName} ${sender.lastName}`.trim(),
        email: sender.email,
        accountStatus: sender.accountStatus,
        kycStatus: sender.kycStatus,
        kybStatus: sender.kybStatus,
        suspensionReason: sender.suspensionReason,
        role: sender.role,
      },
      recentTransactions: recentTransactions.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        currency: item.currency,
        channel: item.channel,
        status: item.status,
        riskScore: Number((item.metadata as Record<string, unknown> | null)?.riskScore ?? item.riskScore ?? 0),
        failureReason: item.failureReason,
        createdAt: item.createdAt,
      })),
    }
  }

  @Get('transactions')
  async getTransactions(@Query('page') page = '1', @Query('limit') limit = '20') {
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const [items, total] = await this.transactionRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { senderWallet: true, recipientWallet: true },
      skip,
      take: limitNum,
    })

    const enriched = await Promise.all(
      items.map(async (tx) => {
        const metadata = (tx.metadata ?? {}) as Record<string, unknown>
        const senderUser = tx.senderWallet
          ? await this.usersService.findById(tx.senderWallet.userId)
          : null
        const recipientUser = tx.recipientWallet
          ? await this.usersService.findById(tx.recipientWallet.userId)
          : null
        return {
          id: tx.id,
          amount: Number(tx.amount),
          currency: tx.currency,
          status: tx.status,
          channel: tx.channel,
          riskScore: Number(metadata.riskScore ?? metadata.risk_score ?? 0),
          riskLevel: String(metadata.riskLevel ?? metadata.risk_level ?? 'UNKNOWN'),
          failureReason: tx.failureReason,
          createdAt: tx.createdAt,
          sender: senderUser ? { id: senderUser.id, name: `${senderUser.firstName} ${senderUser.lastName}`.trim() } : null,
          recipient: recipientUser ? { id: recipientUser.id, name: `${recipientUser.firstName} ${recipientUser.lastName}`.trim() } : null,
        }
      }),
    )

    return { items: enriched, total, page: pageNum, limit: limitNum }
  }

  @Patch('fraud-alerts/:id/review')
  async reviewFraudAlert(
    @Param('id') id: string,
    @Body() body: { status: string; adminNotes?: string; fraudOutcome?: FraudOutcome },
    @Req() req: RequestWithUser,
  ) {
    if (body.status !== 'OPEN' && body.status !== 'INVESTIGATING' && body.status !== 'RESOLVED') {
      throw new BadRequestException('Statut de revue invalide')
    }
    const adminNotes = body.adminNotes?.trim()
    if (!adminNotes || adminNotes.length < 10 || adminNotes.length > 2000) {
      throw new BadRequestException('La conclusion de l’enquête doit contenir entre 10 et 2000 caractères')
    }
    let resolvedOutcome: FraudOutcome | null = null
    if (body.status === 'RESOLVED') {
      if (body.fraudOutcome !== 'CONFIRMED_FRAUD' && body.fraudOutcome !== 'LEGITIMATE') {
        throw new BadRequestException('Un verdict fraude confirmée ou transaction légitime est requis pour terminer la revue')
      }
      resolvedOutcome = body.fraudOutcome
    }
    const transactionId = parseInt(id, 10)
    if (!Number.isSafeInteger(transactionId) || transactionId < 1) {
      throw new BadRequestException('Identifiant de transaction invalide')
    }
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: { senderWallet: true },
    })
    if (!transaction?.senderWallet) throw new NotFoundException('Transaction non trouvée')
    let alert = await this.fraudAlertRepository.findOne({ where: { transactionId } })
    if (!alert) {
      const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
      alert = this.fraudAlertRepository.create({
        transactionId: transaction.id,
        userId: transaction.senderWallet.userId,
        riskScore: Number(metadata.riskScore ?? metadata.risk_score ?? transaction.riskScore ?? 0),
        riskLevel: String(metadata.riskLevel ?? metadata.risk_level ?? transaction.riskLevel ?? 'MEDIUM'),
        reasons: Array.isArray(metadata.riskReasons) ? metadata.riskReasons.join(', ') : (transaction.failureReason ?? ''),
        status: body.status,
        adminNotes,
        fraudOutcome: resolvedOutcome,
        reviewedAt: new Date(),
        reviewedBy: parseInt(req.user.sub, 10),
      })
    } else {
      alert.userId = transaction.senderWallet.userId
      alert.status = body.status
      alert.adminNotes = adminNotes
      alert.fraudOutcome = resolvedOutcome
      alert.reviewedAt = new Date()
      alert.reviewedBy = parseInt(req.user.sub, 10)
    }
    return this.fraudAlertRepository.save(alert)
  }

  @Patch('fraud-alerts/:id/suspend')
  async suspendFraudAlertUser(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body() body: { adminNotes?: string; suspensionReason?: string },
    @Req() req: RequestWithUser,
  ) {
    const adminNotes = body.adminNotes?.trim()
    const suspensionReason = body.suspensionReason?.trim()
    if (!adminNotes || adminNotes.length < 10 || adminNotes.length > 2000) {
      throw new BadRequestException('La conclusion de l’enquête doit contenir entre 10 et 2000 caractères')
    }
    if (!suspensionReason || suspensionReason.length < 10 || suspensionReason.length > 500) {
      throw new BadRequestException('Le motif de suspension doit contenir entre 10 et 500 caractères')
    }
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: { senderWallet: true },
    })
    if (!transaction?.senderWallet) throw new NotFoundException('Transaction non trouvée')
    const user = await this.usersService.findById(transaction.senderWallet.userId)
    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Un compte administrateur ne peut pas être suspendu depuis une alerte fraude')
    }
    if (user.accountStatus === UserStatus.DELETED) {
      throw new BadRequestException('Un compte supprimé ne peut pas être suspendu')
    }

    const adminId = parseInt(req.user.sub, 10)
    const suspendedUser = user.accountStatus === UserStatus.SUSPENDED
      ? user
      : await this.accountManagementService.suspendUser(user.id, suspensionReason, adminId)
    let alert = await this.fraudAlertRepository.findOne({ where: { transactionId } })
    const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
    if (!alert) {
      alert = this.fraudAlertRepository.create({
        transactionId,
        userId: user.id,
        riskScore: Number(metadata.riskScore ?? metadata.risk_score ?? transaction.riskScore ?? 0),
        riskLevel: String(metadata.riskLevel ?? metadata.risk_level ?? transaction.riskLevel ?? 'MEDIUM'),
        reasons: Array.isArray(metadata.riskReasons) ? metadata.riskReasons.join(', ') : transaction.failureReason,
      })
    }
    alert.status = 'INVESTIGATING'
    alert.fraudOutcome = null
    alert.adminNotes = adminNotes
    alert.reviewedAt = new Date()
    alert.reviewedBy = adminId
    await this.fraudAlertRepository.save(alert)
    return {
      accountStatus: suspendedUser.accountStatus,
      suspensionReason: suspendedUser.suspensionReason,
      alertStatus: alert.status,
    }
  }
}
