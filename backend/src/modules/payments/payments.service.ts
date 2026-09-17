import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import axios from 'axios'
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { Transaction } from '../auth/entities/transaction.entity.js'
import { Ledger } from '../auth/entities/ledger.entity.js'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../auth/enums/kyb-status.enum.js'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { TransactionStatus } from '../auth/enums/transaction-status.enum.js'
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js'
import { NotificationService } from '../../notifications/services/notification.service.js'
import { SandboxGatewayService } from './sandbox-gateway.service.js'
import { Queue, Worker } from 'bullmq'
import { createHash, randomInt } from 'node:crypto'

export type FraudRiskDecision = 'APPROVE' | 'REQUIRE_2FA' | 'BLOCK'

export function evaluateRiskDecision(score: number): FraudRiskDecision {
  if (score < 40) return 'APPROVE'
  if (score < 75) return 'REQUIRE_2FA'
  return 'BLOCK'
}

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly paymentQueue: number[] = []
  private queueRunning = false
  private redisQueue?: Queue<{ transactionId: number }>
  private redisWorker?: Worker<{ transactionId: number }>
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction) private transactionRepository: Repository<Transaction>,
    @InjectRepository(Ledger) private ledgerRepository: Repository<Ledger>,
    @InjectDataSource() private dataSource: DataSource,
    private notificationService: NotificationService,
    private sandboxGateway: SandboxGatewayService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url')
    if (!redisUrl) return
    const connection = { url: redisUrl }
    this.redisQueue = new Queue<{ transactionId: number }>('paysmart-payments', { connection })
    this.redisWorker = new Worker<{ transactionId: number }>('paysmart-payments', async (job) => {
      await this.process(job.data.transactionId)
    }, { connection })
  }

  async onModuleDestroy() {
    await this.redisWorker?.close()
    await this.redisQueue?.close()
  }

  async findRecipient(walletNumber: string) {
    const wallet = await this.walletRepository.findOne({ where: { walletNumber } })
    if (!wallet) throw new NotFoundException('Compte destinataire introuvable')
    const user = await this.userRepository.findOne({ where: { id: wallet.userId } })
    if (!user) throw new NotFoundException('Titulaire du compte introuvable')
    return {
      walletNumber: wallet.walletNumber,
      cardNumber: wallet.cardNumber,
      cardHolderName: wallet.cardHolderName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }
  }

  async findRecipientByPhone(phoneNumber: string) {
    const normalizedPhone = phoneNumber.replace(/\D/g, '')
    const users = await this.userRepository.find()
    const user = users.find((candidate) => (candidate.phone ?? '').replace(/\D/g, '') === normalizedPhone)
    if (!user) throw new NotFoundException('Aucun compte associé à ce numéro de téléphone')
    const wallet = await this.walletRepository.findOne({ where: { userId: user.id } })
    if (!wallet) throw new NotFoundException('Le titulaire ne possède pas encore de portefeuille')
    return {
      walletNumber: wallet.walletNumber,
      cardNumber: wallet.cardNumber,
      cardHolderName: wallet.cardHolderName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }
  }

  async getVirtualCard(userId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
    return {
      walletNumber: wallet.walletNumber,
      cardNumber: wallet.cardNumber,
      cardHolderName: wallet.cardHolderName,
      currency: wallet.currency,
      status: wallet.status,
    }
  }

  async initiate(senderUserId: number, dto: InitiatePaymentDto) {
    const sender = await this.userRepository.findOne({ where: { id: senderUserId } })
    if (!sender) throw new NotFoundException('Utilisateur émetteur introuvable')
    if (sender.kycStatus !== KycStatus.APPROVED || (sender.role === 'MERCHANT' && sender.kybStatus !== KybStatus.APPROVED)) {
      throw new BadRequestException('Vérification KYC/KYB requise avant un paiement')
    }

    const senderWallet = await this.walletRepository.findOne({ where: { userId: senderUserId } })
    const isMobileMoney = [PaymentChannel.MVOLA, PaymentChannel.ORANGE_MONEY, PaymentChannel.AIRTEL_MONEY].includes(dto.channel)
    if (isMobileMoney && !dto.phoneNumber) {
      throw new BadRequestException('Le numéro de téléphone est requis pour Mobile Money')
    }
    if (!isMobileMoney && !dto.recipientWalletNumber) {
      throw new BadRequestException('Le numéro du compte destinataire est requis')
    }
    if (dto.channel === PaymentChannel.CARD && !dto.cardToken) {
      throw new BadRequestException('Le token de carte est requis')
    }
    const recipient = isMobileMoney && dto.phoneNumber
      ? (await this.userRepository.find()).find((candidate) => (candidate.phone ?? '').replace(/\D/g, '') === dto.phoneNumber?.replace(/\D/g, ''))
      : null
    const recipientWallet = recipient
      ? await this.walletRepository.findOne({ where: { userId: recipient.id } })
      : await this.walletRepository.findOne({ where: { walletNumber: dto.recipientWalletNumber } })
    if (!senderWallet || !recipientWallet) throw new NotFoundException('Compte émetteur ou destinataire introuvable')
    if (senderWallet.id === recipientWallet.id) throw new BadRequestException('Vous ne pouvez pas vous payer vous-même')
    if (senderWallet.status !== 'ACTIVE' || recipientWallet.status !== 'ACTIVE') throw new BadRequestException('Un portefeuille est inactif')
    if (dto.currency && dto.currency !== (senderWallet.currency || 'EUR')) throw new BadRequestException('Devise non supportée')

    const metadata = {
      phoneNumber: dto.phoneNumber,
      cardToken: dto.cardToken,
      bankReference: dto.bankReference,
      ...(dto.channel === PaymentChannel.QR ? { qrData: `paysmart://pay/${senderWallet.id}/${recipientWallet.id}` } : {}),
      ...(dto.channel === PaymentChannel.BANK_TRANSFER ? { temporaryIban: `FR76PAYSMART${String(recipientWallet.id).padStart(10, '0')}` } : {}),
    }

    const transaction = await this.transactionRepository.save(this.transactionRepository.create({
      senderWalletId: senderWallet.id,
      recipientWalletId: recipientWallet.id,
      amount: dto.amount,
      currency: dto.currency || senderWallet.currency || 'EUR',
      channel: dto.channel,
      status: TransactionStatus.PENDING,
      externalReference: `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      metadata,
    }))

    if (this.redisQueue) {
      await this.redisQueue.add('process-payment', { transactionId: transaction.id }, { removeOnComplete: true, removeOnFail: 100 })
    } else {
      this.paymentQueue.push(transaction.id)
      this.runQueue()
    }
    return transaction
  }

  async findOne(userId: number, transactionId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || (transaction.senderWalletId !== wallet.id && transaction.recipientWalletId !== wallet.id)) {
      throw new NotFoundException('Transaction non trouvée')
    }
    return transaction
  }

  private runQueue() {
    if (this.queueRunning) return
    this.queueRunning = true
    const processNext = async () => {
      const transactionId = this.paymentQueue.shift()
      if (transactionId === undefined) {
        this.queueRunning = false
        return
      }
      await this.process(transactionId)
      setImmediate(() => void processNext())
    }
    void processNext()
  }

  private async evaluateTransactionRisk(senderUserId: number, transaction: Transaction) {
    const baseUrl = this.configService.get<string>('aiService.url', 'http://localhost:8001')
    const apiKey = this.configService.get<string>('aiService.apiKey', 'dev-secret-key-change-in-production')
    const senderWallet = await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } })
    const userId = senderWallet?.userId ?? senderUserId
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const riskPayload = {
      user_id: userId,
      amount: Number(transaction.amount),
      channel: transaction.channel,
      transaction_count_24h: await this.transactionRepository.count({
        where: { senderWalletId: transaction.senderWalletId, createdAt: MoreThanOrEqual(since) },
      }),
      device_id: transaction.metadata?.deviceId ?? 'unknown-device',
      ip_address: transaction.metadata?.ipAddress ?? '0.0.0.0',
      recipient_wallet_id: transaction.recipientWalletId,
      hour: new Date().getHours(),
    }
    const response = await axios.post<{ risk_score: number; risk_level: string; decision: FraudRiskDecision; reasons: string[] }>(
      `${baseUrl}/api/v1/fraud-detection/predict`,
      riskPayload,
      { headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } },
    )
    const riskScore = Number(response.data.risk_score ?? 0)
    const decision = response.data.decision ?? evaluateRiskDecision(riskScore)
    return {
      riskScore,
      riskLevel: response.data.risk_level ?? (riskScore < 40 ? 'LOW' : riskScore < 75 ? 'MEDIUM' : 'HIGH'),
      decision,
      reasons: response.data.reasons ?? ['Transaction analysée par l’IA de fraude.'],
      reason: response.data.reasons?.[0] ?? 'Vérification de fraude terminée.',
    }
  }

  async process(transactionId: number, skipRiskEvaluation = false) {
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || transaction.status !== TransactionStatus.PENDING) return transaction

    try {
      if (!skipRiskEvaluation) {
        const risk = await this.evaluateTransactionRisk(transaction.senderWalletId, transaction)
        const metadata = { ...(transaction.metadata ?? {}), riskScore: risk.riskScore, riskLevel: risk.riskLevel, riskDecision: risk.decision, riskReasons: risk.reasons }
        transaction.metadata = metadata
        if (risk.decision === 'BLOCK') {
          transaction.status = TransactionStatus.FAILED
          transaction.failureReason = `Transaction bloquée par la détection de fraude : ${risk.reason}`
          await this.transactionRepository.save(transaction)
          return transaction
        }
        if (risk.decision === 'REQUIRE_2FA') {
          const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
          transaction.metadata = {
            ...metadata,
            twoFactorCodeHash: createHash('sha256').update(code).digest('hex'),
            twoFactorExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          }
          transaction.status = TransactionStatus.PENDING
          transaction.failureReason = 'Vérification 2FA requise avant exécution.'
          await this.transactionRepository.save(transaction)
          const senderWallet = await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } })
          if (senderWallet) {
            await this.notificationService.create(
              senderWallet.userId,
              'Confirmation 2FA requise',
              `Votre code de confirmation pour le paiement #${transaction.id} est ${code}. Il expire dans 10 minutes.`,
            )
          }
          return transaction
        }
      }
      transaction.status = TransactionStatus.PROCESSING
      await this.transactionRepository.save(transaction)

      const gatewayResult = await this.sandboxGateway.authorize(transaction)
      transaction.externalReference = gatewayResult.providerReference
      await this.transactionRepository.save(transaction)
      await this.dataSource.transaction(async (manager) => {
        const senderWallet = await manager.findOne(Wallet, { where: { id: transaction.senderWalletId }, lock: { mode: 'pessimistic_write' } })
        const recipientWallet = await manager.findOne(Wallet, { where: { id: transaction.recipientWalletId }, lock: { mode: 'pessimistic_write' } })
        if (!senderWallet || !recipientWallet) throw new BadRequestException('Portefeuille indisponible')
        if (Number(senderWallet.balance) < Number(transaction.amount)) throw new BadRequestException('Solde insuffisant')

        senderWallet.balance = Number(senderWallet.balance) - Number(transaction.amount)
        recipientWallet.balance = Number(recipientWallet.balance) + Number(transaction.amount)
        await manager.save([senderWallet, recipientWallet])
        await manager.save(Ledger, [
          manager.create(Ledger, { transactionId, walletId: senderWallet.id, amount: transaction.amount, currency: transaction.currency, direction: 'DEBIT', entryReference: `${transaction.externalReference}-D` }),
          manager.create(Ledger, { transactionId, walletId: recipientWallet.id, amount: transaction.amount, currency: transaction.currency, direction: 'CREDIT', entryReference: `${transaction.externalReference}-C` }),
        ])
      })
      transaction.status = TransactionStatus.COMPLETED
      await this.transactionRepository.save(transaction)
      const recipient = await this.walletRepository.findOne({ where: { id: transaction.recipientWalletId } })
      if (recipient) await this.notificationService.create(recipient.userId, 'Paiement reçu', `Vous avez reçu ${transaction.amount} ${transaction.currency}.`)
    } catch (error) {
      transaction.status = TransactionStatus.FAILED
      transaction.failureReason = error instanceof Error ? error.message : 'Paiement échoué'
      await this.transactionRepository.save(transaction)
    }
    return transaction
  }

  async processForUser(userId: number, transactionId: number) {
    await this.findOne(userId, transactionId)
    return this.process(transactionId)
  }

  async confirmTwoFactor(userId: number, transactionId: number, code: string) {
    const transaction = await this.findOne(userId, transactionId)
    if (transaction.status !== TransactionStatus.PENDING || transaction.failureReason !== 'Vérification 2FA requise avant exécution.') {
      throw new BadRequestException('Cette transaction ne demande pas de confirmation 2FA')
    }

    const senderWallet = await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } })
    if (!senderWallet || senderWallet.userId !== userId) {
      throw new BadRequestException('Seul l’émetteur peut confirmer ce paiement')
    }

    const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
    const expiresAt = typeof metadata.twoFactorExpiresAt === 'string' ? Date.parse(metadata.twoFactorExpiresAt) : 0
    const expectedHash = typeof metadata.twoFactorCodeHash === 'string' ? metadata.twoFactorCodeHash : ''
    const receivedHash = createHash('sha256').update(code).digest('hex')
    if (!expectedHash || !expiresAt || expiresAt < Date.now() || receivedHash !== expectedHash) {
      throw new BadRequestException('Code 2FA invalide ou expiré')
    }

    transaction.metadata = { ...metadata, twoFactorVerified: true }
    transaction.failureReason = null
    await this.transactionRepository.save(transaction)
    return this.process(transactionId, true)
  }

  async findHistory(userId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) return []
    const transactions = await this.transactionRepository.find({
      where: [{ senderWalletId: wallet.id }, { recipientWalletId: wallet.id }],
      order: { createdAt: 'DESC' },
    })
    return transactions.map((transaction) => ({
      ...transaction,
      direction: transaction.senderWalletId === wallet.id ? 'OUTGOING' : 'INCOMING',
    }))
  }
}
