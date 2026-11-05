import { Controller, Get, UseGuards, Param, Patch, Body, Req, Post, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, NotFoundException, ParseIntPipe } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Not, Repository } from 'typeorm'
import { RolesGuard } from '../../../common/guards/roles.guard.js'
import { UsersService } from '../../../users/services/users.service.js'
import { Role } from '../../auth/enums/role.enum.js'
import { Roles } from '../../auth/controllers/auth.controller.js'
import { KycService } from '../services/kyc.service.js'
import { KybService } from '../services/kyb.service.js'
import { ReviewKycDocumentDto } from '../../auth/dto/kyc.dto.js'
import { ReviewKybDocumentDto } from '../../auth/dto/kyb.dto.js'
import { AccountManagementService } from '../../../users/services/account-management.service.js'
import { imageFileFilter, storage } from '../../../storage/storage.config.js'
import { Transaction } from '../../auth/entities/transaction.entity.js'
import { FraudAlert } from '../../auth/entities/fraud-alert.entity.js'
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
  async getFraudAlerts() {
    const transactions = await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
      relations: { senderWallet: true, recipientWallet: true },
    })
    const fraudAlerts = await this.fraudAlertRepository.find({
      where: { transactionId: In(transactions.map((transaction) => transaction.id)) },
    })
    const reviewStatusByTransaction = new Map(
      fraudAlerts.map((alert) => [alert.transactionId, alert.status]),
    )

    const alerts = await Promise.all(
      transactions
        .filter((transaction) => {
          const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
          const riskScore = Number(metadata.riskScore ?? metadata.risk_score ?? 0)
          const hasRiskMetadata = Number.isFinite(riskScore) && riskScore > 0
          const hasFraudFailureReason = typeof transaction.failureReason === 'string'
            && transaction.failureReason.toLowerCase().includes('fraude')
          return hasRiskMetadata || hasFraudFailureReason
        })
        .map(async (transaction) => {
          const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
          const senderUser = transaction.senderWallet
            ? await this.usersService.findById(transaction.senderWallet.userId)
            : null
          const recipientUser = transaction.recipientWallet
            ? await this.usersService.findById(transaction.recipientWallet.userId)
            : null

          const riskScore = Number(metadata.riskScore ?? metadata.risk_score ?? 0)
          const hasFraudFailureReason = typeof transaction.failureReason === 'string'
            && transaction.failureReason.toLowerCase().includes('fraude')
          const riskLevel = String(metadata.riskLevel ?? metadata.risk_level ?? 'UNKNOWN').toUpperCase()
          const riskReasons = Array.isArray(metadata.riskReasons)
            ? metadata.riskReasons.filter((reason): reason is string => typeof reason === 'string')
            : []
          const contextualReason = riskReasons[0]
            ?? transaction.failureReason
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
            reviewStatus: reviewStatusByTransaction.get(transaction.id)
              ?? (riskScore >= 70 || hasFraudFailureReason ? 'OPEN' : 'RESOLVED'),
            reason: contextualReason,
            sender: senderUser ? { id: senderUser.id, name: `${senderUser.firstName} ${senderUser.lastName}`.trim() } : null,
            recipient: recipientUser ? { id: recipientUser.id, name: `${recipientUser.firstName} ${recipientUser.lastName}`.trim() } : null,
            createdAt: transaction.createdAt,
          }
        }),
    )

    return alerts
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
  async reviewFraudAlert(@Param('id') id: string, @Body() body: { status: string; adminNotes?: string }, @Req() req: RequestWithUser) {
    if (body.status !== 'OPEN' && body.status !== 'RESOLVED') {
      throw new BadRequestException('Le statut doit être OPEN ou RESOLVED')
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
        riskScore: Number(metadata.riskScore ?? metadata.risk_score ?? 0),
        riskLevel: String(metadata.riskLevel ?? metadata.risk_level ?? 'MEDIUM'),
        reasons: Array.isArray(metadata.riskReasons) ? metadata.riskReasons.join(', ') : (transaction.failureReason ?? ''),
        status: body.status,
        adminNotes: body.adminNotes ?? null,
        reviewedAt: new Date(),
        reviewedBy: parseInt(req.user.sub, 10),
      })
    } else {
      alert.userId = transaction.senderWallet.userId
      alert.status = body.status
      alert.adminNotes = body.adminNotes ?? alert.adminNotes
      alert.reviewedAt = new Date()
      alert.reviewedBy = parseInt(req.user.sub, 10)
    }
    return this.fraudAlertRepository.save(alert)
  }
}
