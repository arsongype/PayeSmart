import { Controller, Get, UseGuards, Param, Patch, Body, Req, Post, Delete } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RolesGuard } from '../../../common/guards/roles.guard.js'
import { UsersService } from '../../../users/services/users.service.js'
import { Role } from '../../auth/enums/role.enum.js'
import { Roles } from '../../auth/controllers/auth.controller.js'
import { KycService } from '../services/kyc.service.js'
import { KybService } from '../services/kyb.service.js'
import { ReviewKycDocumentDto } from '../../auth/dto/kyc.dto.js'
import { ReviewKybDocumentDto } from '../../auth/dto/kyb.dto.js'
import { AccountManagementService } from '../../../users/services/account-management.service.js'
import { Transaction } from '../../auth/entities/transaction.entity.js'

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
  ) {}

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
          const riskLevel = String(metadata.riskLevel ?? metadata.risk_level ?? 'UNKNOWN').toUpperCase()
          const riskReasons = Array.isArray(metadata.riskReasons)
            ? metadata.riskReasons.filter((reason): reason is string => typeof reason === 'string')
            : []

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
            reason: riskReasons[0] ?? transaction.failureReason ?? 'Signal d’alerte détecté par l’IA de fraude.',
            sender: senderUser ? { id: senderUser.id, name: `${senderUser.firstName} ${senderUser.lastName}`.trim() } : null,
            recipient: recipientUser ? { id: recipientUser.id, name: `${recipientUser.firstName} ${recipientUser.lastName}`.trim() } : null,
            createdAt: transaction.createdAt,
          }
        }),
    )

    return alerts
  }
}
