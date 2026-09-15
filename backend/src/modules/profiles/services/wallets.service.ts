import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Wallet } from '../../auth/entities/wallet.entity.js'
import { CreateWalletDto, UpdateWalletDto } from '../../auth/dto/wallet.dto.js'
import { WalletStatus } from '../../auth/enums/wallet-status.enum.js'
import { User } from '../../auth/entities/user.entity.js'
import { KycStatus } from '../../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../../auth/enums/kyb-status.enum.js'

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
}
