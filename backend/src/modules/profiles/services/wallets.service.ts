import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Wallet } from '../../auth/entities/wallet.entity.js'
import { CreateWalletDto, UpdateWalletDto } from '../../auth/dto/wallet.dto.js'
import { WalletStatus } from '../../auth/enums/wallet-status.enum.js'
import { User } from '../../auth/entities/user.entity.js'
import { KycStatus } from '../../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../../auth/enums/kyb-status.enum.js'
import { SecurityRule } from '../../auth/entities/security-rule.entity.js'

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SecurityRule)
    private securityRuleRepository: Repository<SecurityRule>,
  ) {}

  async create(userId: number, dto: CreateWalletDto) {
    const existing = await this.walletRepository.findOne({ where: { userId } })
    if (existing) {
      throw new ConflictException('Un portefeuille existe déjà pour cet utilisateur')
    }

    const wallet = this.walletRepository.create({
      ...dto,
      userId,
    })

    return this.walletRepository.save(wallet)
  }

  async findByUserId(userId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) {
      throw new NotFoundException('Portefeuille non trouvé')
    }
    return wallet
  }

  async findByUserIdWithEffectiveLimits(userId: number) {
    const wallet = await this.findByUserId(userId)
    const transactionRule = await this.securityRuleRepository.findOne({
      where: { ruleType: 'TRANSACTION_LIMIT', isActive: true },
      order: { priority: 'DESC', updatedAt: 'DESC' },
    })
    const dailyLimitFromRule = this.getNumberCondition(transactionRule, 'dailyLimit')
    const monthlyLimitFromRule = this.getNumberCondition(transactionRule, 'monthlyLimit')
    return {
      ...wallet,
      dailyLimit: dailyLimitFromRule ?? Number(wallet.dailyLimit),
      monthlyLimit: monthlyLimitFromRule ?? Number(wallet.monthlyLimit),
    }
  }

  async update(userId: number, dto: UpdateWalletDto) {
    const wallet = await this.findByUserId(userId)
    Object.assign(wallet, dto)
    return this.walletRepository.save(wallet)
  }

  async updateBalance(userId: number, amount: number) {
    const wallet = await this.findByUserId(userId)
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (amount < 0 && user && (user.kycStatus !== KycStatus.APPROVED || (user.role === 'MERCHANT' && user.kybStatus !== KybStatus.APPROVED))) {
      throw new BadRequestException('Vérification KYC/KYB requise avant toute sortie de fonds')
    }
    
    if (wallet.status === WalletStatus.SUSPENDED) {
      throw new BadRequestException('Portefeuille suspendu')
    }
    
    if (wallet.status === WalletStatus.CLOSED) {
      throw new BadRequestException('Portefeuille fermé')
    }

    wallet.balance = Number(wallet.balance) + amount
    return this.walletRepository.save(wallet)
  }

  async delete(userId: number) {
    const wallet = await this.findByUserId(userId)
    await this.walletRepository.remove(wallet)
    return { message: 'Portefeuille supprimé' }
  }

  private getNumberCondition(rule: SecurityRule | null, key: string) {
    const value = rule?.conditions?.[key]
    const numericValue = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null
  }
}
