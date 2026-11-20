import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity.js'
import { Profile } from '../auth/entities/profile.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../auth/enums/kyb-status.enum.js'
import { WalletStatus } from '../auth/enums/wallet-status.enum.js'
import { Role } from '../auth/enums/role.enum.js'
import { UserStatus } from '../auth/enums/user-status.enum.js'
import { CryptoService } from '../../security/services/crypto.service.js'
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js'
import { WithdrawalMethod } from './withdrawal-method.enum.js'
import { WithdrawalRequest } from './withdrawal-request.entity.js'
import { WithdrawalStatus } from './withdrawal-status.enum.js'

export interface WithdrawalDestination {
  recipientName: string
  account: string
  bankName?: string
  note?: string
}

export interface AdminWithdrawalResponse {
  id: number
  amount: number
  currency: string
  countryCode: string
  method: WithdrawalMethod
  destinationSummary: string
  status: WithdrawalStatus
  adminNote: string | null
  createdAt: Date
  updatedAt: Date
  reviewedAt: Date | null
  paidAt: Date | null
  destination: WithdrawalDestination
  user: { id: number; firstName: string | null; lastName: string | null; email: string } | null
}

@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(WithdrawalRequest) private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(Profile) private readonly profileRepository: Repository<Profile>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cryptoService: CryptoService,
  ) {}

  async getOptions(userId: number) {
    const profile = await this.profileRepository.findOne({ where: { userId } })
    const profileCountry = profile?.country?.trim().toUpperCase() ?? ''
    const countryCode = /^[A-Z]{2}$/.test(profileCountry) ? profileCountry : ''

    return {
      countryCode,
      methods: [WithdrawalMethod.BANK_TRANSFER],
    }
  }

  async create(userId: number, dto: CreateWithdrawalDto) {
    const amount = Number(dto.amount)
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      throw new BadRequestException('Le montant doit être positif et comporter au maximum deux décimales')
    }

    const options = await this.getOptions(userId)
    if (!options.countryCode) {
      throw new BadRequestException('Ajoutez un pays valide à votre profil avant de demander un retrait')
    }
    if (!options.methods.includes(dto.method)) {
      throw new BadRequestException('Ce moyen de retrait n’est pas disponible dans votre pays')
    }
    const destination: WithdrawalDestination = {
      recipientName: dto.recipientName.trim(),
      account: dto.destinationAccount.trim(),
      bankName: dto.bankName?.trim(),
      ...(dto.note?.trim() ? { note: dto.note.trim() } : {}),
    }

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.getRepository(Wallet).findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
      if (wallet.status !== WalletStatus.ACTIVE) throw new BadRequestException('Votre portefeuille n’est pas actif')

      const user = await manager.getRepository(User).findOneBy({ id: userId })
      if (!user || user.accountStatus !== UserStatus.ACTIVE) throw new BadRequestException('Votre compte n’est pas actif')
      const verified = user.kycStatus === KycStatus.APPROVED || user.kycStatus === KycStatus.VERIFIE
      const merchantVerified = user.role !== Role.MERCHANT
        || user.kybStatus === KybStatus.APPROVED
        || user.kybStatus === KybStatus.VERIFIE
      if (!verified || !merchantVerified) {
        throw new BadRequestException('La vérification KYC/KYB doit être approuvée avant un retrait')
      }

      const currentBalanceCents = Math.round(Number(wallet.balance) * 100)
      const amountCents = Math.round(amount * 100)
      if (currentBalanceCents < amountCents) throw new BadRequestException('Solde disponible insuffisant')

      wallet.balance = (currentBalanceCents - amountCents) / 100
      await manager.getRepository(Wallet).save(wallet)

      const request = manager.getRepository(WithdrawalRequest).create({
        userId,
        walletId: wallet.id,
        amount,
        currency: wallet.currency || 'EUR',
        countryCode: options.countryCode,
        method: dto.method,
        destinationCiphertext: this.cryptoService.encrypt(JSON.stringify(destination)),
        status: WithdrawalStatus.PENDING,
      })
      const saved = await manager.getRepository(WithdrawalRequest).save(request)
      return this.toUserResponse(saved)
    })
  }

  async findMine(userId: number) {
    const requests = await this.withdrawalRepository.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    })
    return requests.map((request) => this.toUserResponse(request))
  }

  async cancel(userId: number, id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WithdrawalRequest)
      const request = await repository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!request) throw new NotFoundException('Demande de retrait introuvable')
      if (request.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException('Seules les demandes en attente peuvent être annulées')
      }

      const wallet = await manager.getRepository(Wallet).findOne({
        where: { id: request.walletId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
      wallet.balance = (Math.round(Number(wallet.balance) * 100) + Math.round(Number(request.amount) * 100)) / 100
      request.status = WithdrawalStatus.CANCELLED
      request.adminNote = 'Annulée par le titulaire du compte'
      await manager.getRepository(Wallet).save(wallet)
      await repository.save(request)
      return this.toUserResponse(request)
    })
  }

  async findAllForAdmin(): Promise<AdminWithdrawalResponse[]> {
    const requests = await this.withdrawalRepository.find({ order: { createdAt: 'DESC', id: 'DESC' } })
    return Promise.all(requests.map(async (request) => {
      const user = await this.userRepository.findOne({ where: { id: request.userId } })
      return {
        ...this.toUserResponse(request),
        destination: this.decryptDestination(request.destinationCiphertext),
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        } : null,
      }
    }))
  }

  async approve(id: number, adminId: number) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.lockAdminRequest(manager, id)
      if (request.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException('Cette demande n’est plus en attente')
      }
      request.status = WithdrawalStatus.APPROVED
      request.reviewedBy = adminId
      request.reviewedAt = new Date()
      return this.toUserResponse(await manager.getRepository(WithdrawalRequest).save(request))
    })
  }

  async reject(id: number, adminId: number, note: string) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.lockAdminRequest(manager, id)
      if (request.status !== WithdrawalStatus.PENDING && request.status !== WithdrawalStatus.APPROVED) {
        throw new BadRequestException('Cette demande ne peut plus être refusée')
      }
      const wallet = await manager.getRepository(Wallet).findOne({
        where: { id: request.walletId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
      wallet.balance = (Math.round(Number(wallet.balance) * 100) + Math.round(Number(request.amount) * 100)) / 100
      request.status = WithdrawalStatus.REJECTED
      request.adminNote = note.trim()
      request.reviewedBy = adminId
      request.reviewedAt = new Date()
      await manager.getRepository(Wallet).save(wallet)
      return this.toUserResponse(await manager.getRepository(WithdrawalRequest).save(request))
    })
  }

  async markPaid(id: number, adminId: number, note?: string) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.lockAdminRequest(manager, id)
      if (request.status !== WithdrawalStatus.APPROVED) {
        throw new BadRequestException('Seules les demandes approuvées peuvent être marquées comme payées')
      }
      request.status = WithdrawalStatus.PAID
      request.paidBy = adminId
      request.paidAt = new Date()
      if (note?.trim()) request.adminNote = note.trim()
      return this.toUserResponse(await manager.getRepository(WithdrawalRequest).save(request))
    })
  }

  private async lockAdminRequest(manager: EntityManager, id: number) {
    const request = await manager.getRepository(WithdrawalRequest).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    })
    if (!request) throw new NotFoundException('Demande de retrait introuvable')
    return request
  }

  private decryptDestination(ciphertext: string): WithdrawalDestination {
    return JSON.parse(this.cryptoService.decrypt(ciphertext)) as WithdrawalDestination
  }

  private toUserResponse(request: WithdrawalRequest) {
    const destination = this.decryptDestination(request.destinationCiphertext)
    return {
      id: request.id,
      amount: Number(request.amount),
      currency: request.currency,
      countryCode: request.countryCode,
      method: request.method,
      destinationSummary: `${destination.recipientName} · ••••${destination.account.slice(-4)}`,
      status: request.status,
      adminNote: request.adminNote,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      reviewedAt: request.reviewedAt,
      paidAt: request.paidAt,
    }
  }
}
