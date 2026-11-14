import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import axios from 'axios'
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { Transaction } from '../auth/entities/transaction.entity.js'
import { Ledger } from '../auth/entities/ledger.entity.js'
import { FraudAlert } from '../auth/entities/fraud-alert.entity.js'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../auth/enums/kyb-status.enum.js'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { TransactionStatus } from '../auth/enums/transaction-status.enum.js'
import { Role } from '../auth/enums/role.enum.js'
import { UserStatus } from '../auth/enums/user-status.enum.js'
import { WalletStatus } from '../auth/enums/wallet-status.enum.js'
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js'
import { QuotePaymentDto } from './dto/quote-payment.dto.js'
import { NotificationService } from '../../notifications/services/notification.service.js'
import { SandboxGatewayService } from './sandbox-gateway.service.js'
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { createHash, randomInt } from 'node:crypto'
import * as argon2 from 'argon2'
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib'
import { CryptoService } from '../../security/services/crypto.service.js'
import { SecurityRule } from '../auth/entities/security-rule.entity.js'
import { OtpCode } from '../auth/entities/otp-code.entity.js'
import { convertPaymentCurrency, normalizeFraudRiskAmount, PAYMENT_CURRENCIES } from './payment-currency.js'

export type FraudRiskDecision = 'APPROVE' | 'REQUIRE_2FA' | 'BLOCK'
export const PAYMENT_TWO_FACTOR_TTL_MS = 30 * 60 * 1000
const PAYMENT_NOTIFICATION_OTP_TTL_MS = 2 * 60 * 1000
const PAYMENT_NOTIFICATION_OTP_RESEND_DELAY_MS = 60 * 1000
const PAYMENT_NOTIFICATION_OTP_MAX_ATTEMPTS = 5
const PAYMENT_NOTIFICATION_OTP_PURPOSE = 'PAYMENT_CONFIRMATION'
const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() })

function normalizePhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0') && digits.length === 10) return `261${digits.slice(1)}`
  return digits
}

export function evaluateRiskDecision(score: number, lowThreshold = 30, mediumThreshold = 70): FraudRiskDecision {
  if (score < lowThreshold) return 'APPROVE'
  if (score < mediumThreshold) return 'REQUIRE_2FA'
  return 'BLOCK'
}

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly paymentQueue: number[] = []
  private queueRunning = false
  private redisQueue?: Queue<{ transactionId: number }>
  private redisWorker?: Worker<{ transactionId: number }>
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction) private transactionRepository: Repository<Transaction>,
    @InjectRepository(Ledger) private ledgerRepository: Repository<Ledger>,
    @InjectRepository(FraudAlert) private fraudAlertRepository: Repository<FraudAlert>,
    @InjectRepository(SecurityRule) private securityRuleRepository: Repository<SecurityRule>,
    @InjectRepository(OtpCode) private otpCodeRepository: Repository<OtpCode>,
    @InjectDataSource() private dataSource: DataSource,
    private notificationService: NotificationService,
    private sandboxGateway: SandboxGatewayService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url')
    if (!redisUrl) return

    const redisProbe = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 1000,
      maxRetriesPerRequest: 1,
    })
    redisProbe.on('error', () => undefined)

    try {
      await redisProbe.connect()
      await redisProbe.ping()
    } catch {
      this.logger.warn('Redis is unavailable; using the in-memory payment queue')
      return
    } finally {
      redisProbe.disconnect()
    }

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
      cardHolderName: wallet.cardHolderName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }
  }

  async findRecipientByPhone(phoneNumber: string) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    const users = await this.userRepository.find()
    const user = users.find((candidate) => normalizePhoneNumber(candidate.phone ?? '') === normalizedPhone)
    if (!user) throw new NotFoundException('Aucun compte associé à ce numéro de téléphone')
    const wallet = await this.walletRepository.findOne({ where: { userId: user.id } })
    if (!wallet) throw new NotFoundException('Le titulaire ne possède pas encore de portefeuille')
    return {
      walletNumber: wallet.walletNumber,
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

  private async calculateFee(amount: number) {
    const rule = await this.securityRuleRepository.findOne({
      where: { ruleType: 'TRANSACTION_FEE', isActive: true },
      order: { priority: 'DESC', updatedAt: 'DESC' },
    })
    const conditions = (rule?.conditions ?? {}) as Record<string, unknown>
    const percentage = typeof conditions.percentage === 'number' ? conditions.percentage : 1
    const fixedAmount = typeof conditions.fixedAmount === 'number' ? conditions.fixedAmount : 0
    const minimumFee = typeof conditions.minimumFee === 'number' ? conditions.minimumFee : 0
    const maximumFee = typeof conditions.maximumFee === 'number' ? conditions.maximumFee : Number.POSITIVE_INFINITY
    const calculated = amount * (Math.max(0, percentage) / 100) + Math.max(0, fixedAmount)
    return Math.round(Math.min(maximumFee, Math.max(minimumFee, calculated)) * 100) / 100
  }

  async quote(senderUserId: number, dto: QuotePaymentDto) {
    const wallet = await this.walletRepository.findOne({ where: { userId: senderUserId } })
    if (!wallet) throw new NotFoundException('Portefeuille non trouvé')

    const amount = Math.round(Number(dto.amount) * 100) / 100
    const currency = dto.currency ?? wallet.currency ?? 'EUR'
    if (!PAYMENT_CURRENCIES.includes(currency) || !PAYMENT_CURRENCIES.includes(wallet.currency ?? 'EUR')) {
      throw new BadRequestException('Devise non prise en charge par le sandbox')
    }
    const feeAmount = await this.calculateFee(amount)
    const totalAmount = Math.round((amount + feeAmount) * 100) / 100
    return {
      amount,
      feeAmount,
      totalAmount,
      currency,
      walletCurrency: wallet.currency || 'EUR',
      walletDebitAmount: convertPaymentCurrency(totalAmount, currency, wallet.currency || 'EUR'),
    }
  }

  async initiate(senderUserId: number, dto: InitiatePaymentDto, securityContext?: { ipAddress: string; deviceFingerprint: string }) {
    const sender = await this.userRepository.findOne({ where: { id: senderUserId } })
    if (!sender) throw new NotFoundException('Utilisateur émetteur introuvable')
    if (sender.kycStatus !== KycStatus.APPROVED || (sender.role === 'MERCHANT' && sender.kybStatus !== KybStatus.APPROVED)) {
      throw new BadRequestException('Vérification KYC/KYB requise avant un paiement')
    }

    if (dto.idempotencyKey) {
      const existing = await this.transactionRepository.findOne({ where: { idempotencyKey: dto.idempotencyKey } })
      if (existing) return existing
    }

    const senderWallet = await this.walletRepository.findOne({ where: { userId: senderUserId } })
    const isMobileMoney = [PaymentChannel.MVOLA, PaymentChannel.ORANGE_MONEY, PaymentChannel.AIRTEL_MONEY].includes(dto.channel)
    if (isMobileMoney) {
      throw new BadRequestException('Les paiements Mobile Money ne sont plus disponibles')
    }
    if (!dto.recipientWalletNumber) {
      throw new BadRequestException('Le numéro du compte destinataire est requis')
    }
    if (
      dto.channel === PaymentChannel.CARD
      && (typeof dto.cardToken !== 'string' || !dto.cardToken.startsWith('tok_test_'))
    ) {
      throw new BadRequestException('Un token de carte de test sandbox est requis')
    }
    const recipientWallet = await this.walletRepository.findOne({ where: { walletNumber: dto.recipientWalletNumber } })
    if (!senderWallet || !recipientWallet) throw new NotFoundException('Compte émetteur ou destinataire introuvable')
    if (senderWallet.id === recipientWallet.id) throw new BadRequestException('Vous ne pouvez pas vous payer vous-même')
    if (senderWallet.status !== 'ACTIVE' || recipientWallet.status !== 'ACTIVE') throw new BadRequestException('Un portefeuille est inactif')
    const currency = dto.currency ?? senderWallet.currency ?? 'EUR'
    const senderCurrency = senderWallet.currency || 'EUR'
    const recipientCurrency = recipientWallet.currency || senderCurrency
    if (
      !PAYMENT_CURRENCIES.includes(currency)
      || !PAYMENT_CURRENCIES.includes(senderCurrency)
      || !PAYMENT_CURRENCIES.includes(recipientCurrency)
    ) {
      throw new BadRequestException('Devise non prise en charge par le sandbox')
    }

    const amount = Math.round(Number(dto.amount) * 100) / 100
    const feeAmount = await this.calculateFee(amount)
    const totalAmount = Math.round((amount + feeAmount) * 100) / 100
    const senderDebitAmount = convertPaymentCurrency(totalAmount, currency, senderCurrency)
    const recipientCreditAmount = convertPaymentCurrency(amount, currency, recipientCurrency)
    if (senderDebitAmount <= 0 || recipientCreditAmount <= 0) {
      throw new BadRequestException('Le montant est trop faible après conversion')
    }
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const transactionsThisMonth = await this.transactionRepository.find({
      where: {
        senderWalletId: senderWallet.id,
        status: In([TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.PROCESSING]),
        createdAt: MoreThanOrEqual(monthStart),
      },
    })
    const getWalletDebitAmount = (transaction: Transaction) => {
      const historicalDebit = Number(transaction.metadata?.senderDebitAmount)
      if (Number.isFinite(historicalDebit) && historicalDebit > 0) return historicalDebit
      return Number(transaction.totalAmount) > 0 ? Number(transaction.totalAmount) : Number(transaction.amount)
    }
    const spentThisMonth = transactionsThisMonth.reduce((sum, transaction) => sum + getWalletDebitAmount(transaction), 0)
    const spentToday = transactionsThisMonth
      .filter((transaction) => transaction.createdAt >= dayStart)
      .reduce((sum, transaction) => sum + getWalletDebitAmount(transaction), 0)
    const transactionRule = await this.securityRuleRepository.findOne({ where: { ruleType: 'TRANSACTION_LIMIT', isActive: true }, order: { priority: 'DESC', updatedAt: 'DESC' } })
    const conditions = transactionRule?.conditions ?? {}
    const transactionLimit = this.getNumericCondition(conditions.transactionLimit) ?? Number.POSITIVE_INFINITY
    const paymentAttempts = this.getNumericCondition(conditions.paymentAttempts) ?? Number.POSITIVE_INFINITY
    const dailyLimitRule = this.getNumericCondition(conditions.dailyLimit)
    const monthlyLimitRule = this.getNumericCondition(conditions.monthlyLimit)
    if (senderDebitAmount > transactionLimit) throw new BadRequestException('Le plafond de transaction est dépassé')
    const since = new Date(Date.now() - 60 * 60 * 1000)
    const recentAttempts = await this.transactionRepository.count({ where: { senderWalletId: senderWallet.id, createdAt: MoreThanOrEqual(since) } })
    if (recentAttempts >= paymentAttempts) throw new BadRequestException('Le nombre maximal de tentatives de paiement par heure est atteint')
    const effectiveDailyLimit = dailyLimitRule ?? this.getPositiveNumber(senderWallet.dailyLimit)
    const effectiveMonthlyLimit = monthlyLimitRule ?? this.getPositiveNumber(senderWallet.monthlyLimit)
    if (effectiveDailyLimit !== null && spentToday + senderDebitAmount > effectiveDailyLimit) {
      throw new BadRequestException(dailyLimitRule !== null ? 'Le plafond journalier global est dépassé' : 'Le plafond journalier du portefeuille est dépassé')
    }
    if (effectiveMonthlyLimit !== null && spentThisMonth + senderDebitAmount > effectiveMonthlyLimit) {
      throw new BadRequestException(monthlyLimitRule !== null ? 'Le plafond mensuel global est dépassé' : 'Le plafond mensuel du portefeuille est dépassé')
    }

    const frontendBaseUrl = (this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:5173').replace(/\/$/, '')
    const metadata = {
      senderDebitAmount,
      recipientCreditAmount,
      senderCurrency,
      recipientCurrency,
      sandboxExchangeRate: true,
      cardToken: dto.cardToken ? this.cryptoService.encrypt(dto.cardToken) : undefined,
      deviceId: securityContext?.deviceFingerprint ? createHash('sha256').update(securityContext.deviceFingerprint).digest('hex') : undefined,
      ipAddress: securityContext?.ipAddress,
    }

    const transaction = await this.transactionRepository.save(this.transactionRepository.create({
      senderWalletId: senderWallet.id,
      recipientWalletId: recipientWallet.id,
      amount,
      feeAmount,
      totalAmount,
      currency,
      channel: dto.channel,
      status: TransactionStatus.PENDING,
      externalReference: `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata,
    }))

    if (dto.channel === PaymentChannel.QR) {
      const notificationLink = `${frontendBaseUrl}/payments/confirm/${transaction.id}`
      try {
        await this.notificationService.create(
          recipientWallet.userId,
          'Demande de paiement QR',
          `Vérifiez le bénéficiaire et le montant, puis confirmez le paiement avec votre code Google Authenticator.`,
          notificationLink,
        )
      } catch (error) {
        this.logger.error(`QR payment ${transaction.id} was created, but the recipient notification could not be saved`, error)
      }
    }

    if (dto.channel !== PaymentChannel.QR) {
      if (this.redisQueue) {
        await this.redisQueue.add('process-payment', { transactionId: transaction.id }, { removeOnComplete: true, removeOnFail: 100 })
      } else {
        this.paymentQueue.push(transaction.id)
        this.runQueue()
      }
    }
    const safeTransaction = this.withoutQrConfirmationLinkForPayer(transaction, senderWallet.id)
    if (transaction.channel !== PaymentChannel.QR) return safeTransaction

    const qrRecipientWallet = await this.walletRepository.findOne({ where: { id: transaction.recipientWalletId } })
    const recipient = qrRecipientWallet
      ? await this.userRepository.findOne({ where: { id: qrRecipientWallet.userId } })
      : null
    return {
      ...safeTransaction,
      recipient: {
        name: recipient ? `${recipient.firstName} ${recipient.lastName}`.trim() : '',
        walletNumber: qrRecipientWallet?.walletNumber ?? '',
      },
    }
  }

  async findOne(userId: number, transactionId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || (transaction.senderWalletId !== wallet.id && transaction.recipientWalletId !== wallet.id)) {
      throw new NotFoundException('Transaction non trouvée')
    }

    await this.expireTwoFactorIfNeeded(transaction)
    const metadata = transaction.metadata ?? {}
    const hasRiskAnalysis = typeof metadata.riskScore === 'number' && typeof metadata.riskLevel === 'string'
    if (!hasRiskAnalysis) {
      try {
        const risk = await this.evaluateTransactionRisk(userId, transaction)
        transaction.metadata = {
          ...metadata,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          riskDecision: risk.decision,
          riskReasons: risk.reasons,
          riskFeatures: risk.features,
        }
        await this.transactionRepository.save(transaction)
      } catch (error) {
        console.error(`Risk analysis unavailable for transaction ${transaction.id}:`, error)
      }
    }
    if (transaction.channel === PaymentChannel.QR) {
      const recipientWallet = await this.walletRepository.findOne({ where: { id: transaction.recipientWalletId } })
      const recipient = recipientWallet
        ? await this.userRepository.findOne({ where: { id: recipientWallet.userId } })
        : null
      const responseTransaction = this.withoutQrConfirmationLinkForPayer(transaction, wallet.id)
      return {
        ...responseTransaction,
        canConfirmQr: transaction.recipientWalletId === wallet.id,
        recipient: {
          name: recipient ? `${recipient.firstName} ${recipient.lastName}`.trim() : '',
          walletNumber: recipientWallet?.walletNumber ?? '',
        },
      }
    }
    return this.withoutSensitiveTransactionData(transaction)
  }

  async findQrConfirmation(userId: number, transactionId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (
      !wallet
      || !transaction
      || transaction.channel !== PaymentChannel.QR
      || transaction.recipientWalletId !== wallet.id
    ) {
      throw new NotFoundException('Transaction non trouvée')
    }
    return this.findOne(userId, transactionId)
  }

  async confirmQr(recipientUserId: number, transactionId: number, code: string) {
    const recipientWallet = await this.walletRepository.findOne({ where: { userId: recipientUserId } })
    if (!recipientWallet) throw new NotFoundException('Portefeuille destinataire non trouvé')
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction) throw new NotFoundException('Transaction non trouvée')
    if (transaction.channel !== PaymentChannel.QR) throw new BadRequestException('Ce paiement n\'est pas un paiement QR')
    if (transaction.recipientWalletId !== recipientWallet.id) throw new BadRequestException('Seul le destinataire peut confirmer ce paiement')
    if (transaction.status !== TransactionStatus.PENDING) throw new BadRequestException('Cette demande n\'est plus en attente de confirmation')
    const recipient = await this.userRepository.findOne({ where: { id: recipientUserId } })
    if (!recipient?.isTwoFactorEnabled || !recipient.twoFactorSecret) {
      throw new BadRequestException('Activez Google Authenticator dans les paramètres de sécurité avant de confirmer ce paiement')
    }
    const verification = await totp.verify(code.trim(), { secret: recipient.twoFactorSecret, epochTolerance: 30 })
    if (!verification.valid) throw new BadRequestException('Code Google Authenticator invalide ou expiré')

    transaction.metadata = {
      ...transaction.metadata,
      qrConfirmedAt: new Date().toISOString(),
      twoFactorVerified: true,
      twoFactorVerifiedAt: new Date().toISOString(),
    }
    await this.transactionRepository.save(transaction)
    const result = await this.process(transactionId)
    return result ? this.withoutSensitiveTransactionData(result) : null
  }

  private async executePayment(transaction: Transaction) {
    try {
      const gatewayTransaction = {
        ...transaction,
        metadata: this.decryptSensitiveMetadata(transaction.metadata),
      } as Transaction
      const gatewayResult = await this.sandboxGateway.authorize(gatewayTransaction)
      transaction.externalReference = gatewayResult.providerReference
      if (transaction.metadata) delete transaction.metadata.cardToken
      await this.transactionRepository.save(transaction)
      let adminFeeRecipientUserId: number | null = null
      await this.dataSource.transaction(async (manager) => {
        const senderWallet = await manager.findOne(Wallet, { where: { id: transaction.senderWalletId }, lock: { mode: 'pessimistic_write' } })
        const recipientWallet = await manager.findOne(Wallet, { where: { id: transaction.recipientWalletId }, lock: { mode: 'pessimistic_write' } })
        if (!senderWallet || !recipientWallet) throw new BadRequestException('Portefeuille indisponible')
        const admins = await manager.find(User, { where: { role: Role.ADMIN, accountStatus: UserStatus.ACTIVE }, order: { id: 'ASC' } })
        let adminUser: User | undefined
        let adminWallet: Wallet | null = null
        for (const candidate of admins) {
          adminWallet = await manager.findOne(Wallet, {
            where: { userId: candidate.id, status: WalletStatus.ACTIVE },
            lock: { mode: 'pessimistic_write' },
          })
          if (adminWallet && adminWallet.id !== senderWallet.id && adminWallet.id !== recipientWallet.id) {
            adminUser = candidate
            break
          }
          adminWallet = null
        }
        if (!adminUser || !adminWallet) throw new BadRequestException('Portefeuille de frais admin introuvable')
        adminFeeRecipientUserId = adminUser.id
        const senderDebitAmount = Number(transaction.metadata?.senderDebitAmount)
        const recipientCreditAmount = Number(transaction.metadata?.recipientCreditAmount)
        const feeAmount = Number(transaction.feeAmount)
        const debitAmount = Number.isFinite(senderDebitAmount) && senderDebitAmount > 0
          ? senderDebitAmount
          : Number(transaction.totalAmount) > 0 ? Number(transaction.totalAmount) : Number(transaction.amount)
        const creditAmount = Number.isFinite(recipientCreditAmount) && recipientCreditAmount > 0
          ? recipientCreditAmount
          : Number(transaction.amount)
        const adminFeeCurrency = adminWallet.currency || transaction.currency
        const adminFeeCreditAmount = feeAmount > 0
          ? convertPaymentCurrency(feeAmount, transaction.currency, adminFeeCurrency)
          : 0
        if (Number(senderWallet.balance) < debitAmount) throw new BadRequestException('Solde insuffisant')

        senderWallet.balance = Number(senderWallet.balance) - debitAmount
        recipientWallet.balance = Number(recipientWallet.balance) + creditAmount
        const feeWallet = adminWallet
        feeWallet.balance = Number(feeWallet.balance) + adminFeeCreditAmount
        const walletsToSave = [...new Map([senderWallet, recipientWallet, feeWallet].map((wallet) => [wallet.id, wallet])).values()]
        await manager.save(walletsToSave)
        const ledgerEntries = [
          manager.create(Ledger, { transactionId: transaction.id, walletId: senderWallet.id, amount: debitAmount, currency: senderWallet.currency || transaction.currency, direction: 'DEBIT', entryReference: `${transaction.externalReference}-D` }),
          manager.create(Ledger, { transactionId: transaction.id, walletId: recipientWallet.id, amount: creditAmount, currency: recipientWallet.currency || transaction.currency, direction: 'CREDIT', entryReference: `${transaction.externalReference}-C` }),
        ]
        if (adminFeeCreditAmount > 0) {
          ledgerEntries.push(manager.create(Ledger, {
            transactionId: transaction.id,
            walletId: feeWallet.id,
            amount: adminFeeCreditAmount,
            currency: adminFeeCurrency,
            direction: 'CREDIT',
            entryReference: `${transaction.externalReference}-FEE`,
          }))
        }
        await manager.save(Ledger, ledgerEntries)
        transaction.metadata = {
          ...transaction.metadata,
          adminFeeCreditAmount,
          adminFeeCurrency,
        }
        transaction.status = TransactionStatus.COMPLETED
        transaction.failureReason = null
        await manager.save(transaction)
      })
      try {
        const [recipient, sender] = await Promise.all([
          this.walletRepository.findOne({ where: { id: transaction.recipientWalletId } }),
          this.walletRepository.findOne({ where: { id: transaction.senderWalletId } }),
        ])
        const senderName = sender?.cardHolderName?.trim() || 'le payeur'
        const recipientName = recipient?.cardHolderName?.trim() || 'le destinataire'
        const recipientCreditAmount = Number(transaction.metadata?.recipientCreditAmount)
        const recipientAmount = Number.isFinite(recipientCreditAmount) && recipientCreditAmount > 0
          ? recipientCreditAmount
          : Number(transaction.amount)
        const recipientCurrency = typeof transaction.metadata?.recipientCurrency === 'string'
          ? transaction.metadata.recipientCurrency
          : transaction.currency
        const adminFeeCreditAmount = Number(transaction.metadata?.adminFeeCreditAmount)
        const adminFeeCurrency = typeof transaction.metadata?.adminFeeCurrency === 'string'
          ? transaction.metadata.adminFeeCurrency
          : transaction.currency
        const notifications = await Promise.allSettled([
          ...(recipient ? [this.notificationService.create(
            recipient.userId,
            'Paiement reçu',
            `Vous avez reçu ${recipientAmount.toFixed(2)} ${recipientCurrency} de ${senderName}.`,
          )] : []),
          ...(sender ? [this.notificationService.create(
            sender.userId,
            'Paiement réussi',
            `Votre paiement de ${Number(transaction.amount).toFixed(2)} ${transaction.currency} vers ${recipientName} a réussi.`,
          )] : []),
          ...(adminFeeRecipientUserId !== null && Number.isFinite(adminFeeCreditAmount) && adminFeeCreditAmount > 0
            ? [this.notificationService.create(
              adminFeeRecipientUserId,
              'Frais de transaction reçus',
              `Frais de transaction de ${adminFeeCreditAmount.toFixed(2)} ${adminFeeCurrency} reçus pour le paiement de ${senderName} vers ${recipientName} (#${transaction.id}).`,
            )]
            : []),
        ])
        for (const result of notifications) {
          if (result.status === 'rejected') {
            this.logger.error(`Payment ${transaction.id} completed, but a notification could not be saved`, result.reason)
          }
        }
      } catch (error) {
        this.logger.error(`Payment ${transaction.id} completed, but payment notifications could not be prepared`, error)
      }
    } catch (error) {
      if (transaction.metadata) delete transaction.metadata.cardToken
      transaction.status = TransactionStatus.FAILED
      transaction.failureReason = error instanceof Error ? error.message : 'Paiement échoué'
      await this.transactionRepository.save(transaction)
      await this.notifyPaymentFailure(transaction)
    }
    return this.withoutSensitiveTransactionData(transaction)
  }

  private async notifyPaymentFailure(transaction: Transaction) {
    try {
      const senderWallet = await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } })
      if (!senderWallet) {
        this.logger.error(`Payment ${transaction.id} failed, but the sender wallet could not be found for notification`)
        return
      }

      const isBlocked = Boolean(transaction.failureReason?.startsWith('Transaction bloquée par la détection de fraude')
        || transaction.failureReason?.startsWith('Paiement bloqué par le contrôle de sécurité')
      )
      const title = isBlocked ? 'Paiement bloqué' : 'Paiement échoué'
      const summary = this.getPaymentFailureSummary(transaction.failureReason, isBlocked)
      await this.notificationService.create(
        senderWallet.userId,
        title,
        `Paiement #${transaction.id} ${isBlocked ? 'bloqué' : 'échoué'} : ${summary}`,
      )
    } catch (error) {
      this.logger.error(`Payment ${transaction.id} failed, but its sender notification could not be saved`, error)
    }
  }

  private getPaymentFailureSummary(reason: string | null, isBlocked: boolean) {
    if (isBlocked) return 'contrôle de sécurité requis.'
    if (!reason) return 'veuillez réessayer.'
    const normalizedReason = reason.toLowerCase()
    if (normalizedReason.includes('solde insuffisant')) return 'solde insuffisant.'
    if (normalizedReason.includes('délai') || normalizedReason.includes('expiré')) return 'confirmation expirée.'
    if (normalizedReason.includes('portefeuille')) return 'portefeuille indisponible.'
    const conciseReason = reason.replace(/\s+/g, ' ').trim()
    return `${conciseReason.slice(0, 100)}${conciseReason.length > 100 ? '...' : ''}`
  }

  private withoutSensitiveTransactionData(transaction: Transaction): Transaction {
    const metadata = { ...transaction.metadata }
    delete metadata.twoFactorCodeHash
    delete metadata.cardToken
    return { ...transaction, metadata }
  }

  private withoutQrConfirmationLinkForPayer(transaction: Transaction, walletId: number): Transaction {
    const safeTransaction = this.withoutSensitiveTransactionData(transaction)
    if (
      transaction.channel === PaymentChannel.QR
      && transaction.senderWalletId === walletId
      && safeTransaction.metadata
    ) {
      delete safeTransaction.metadata.qrData
    }
    return safeTransaction
  }

  private async expireTwoFactorIfNeeded(transaction: Transaction) {
    if (transaction.status !== TransactionStatus.PENDING || transaction.failureReason !== 'Vérification 2FA requise avant exécution.') return
    const metadata = { ...transaction.metadata }
    const expiresAt = typeof metadata.twoFactorExpiresAt === 'string' ? Date.parse(metadata.twoFactorExpiresAt) : 0
    if (expiresAt > Date.now()) return
    delete metadata.twoFactorCodeHash
    delete metadata.twoFactorExpiresAt
    transaction.metadata = metadata
    transaction.status = TransactionStatus.FAILED
    transaction.failureReason = 'Le délai de confirmation 2FA est expiré.'
    await this.transactionRepository.save(transaction)
    await this.notifyPaymentFailure(transaction)
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
    const baseUrl = this.configService.get<string>('aiService.url', 'http://localhost:8120')
    const apiKey = this.configService.getOrThrow<string>('aiService.apiKey')
    const thresholdRule = await this.securityRuleRepository.findOne({ where: { ruleType: 'AI_THRESHOLDS', isActive: true }, order: { priority: 'DESC', updatedAt: 'DESC' } })
    const thresholdConditions = thresholdRule?.conditions ?? {}
    const lowThreshold = (this.getNumericCondition(thresholdConditions.lowRiskThreshold) ?? 0.3) * 100
    const mediumThreshold = (this.getNumericCondition(thresholdConditions.mediumRiskThreshold) ?? 0.7) * 100
    if (lowThreshold >= mediumThreshold || mediumThreshold > 100) {
      throw new BadRequestException('Les seuils de détection de fraude configurés sont invalides')
    }
    const senderWallet = await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } })
    const userId = senderWallet?.userId ?? senderUserId
    const storedDebitAmount = Number(transaction.metadata?.senderDebitAmount)
    const riskAmount = Number.isFinite(storedDebitAmount) && storedDebitAmount > 0
      ? normalizeFraudRiskAmount(storedDebitAmount, String(transaction.metadata?.senderCurrency ?? senderWallet?.currency ?? 'EUR'))
      : normalizeFraudRiskAmount(Number(transaction.amount), transaction.currency)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const riskPayload = {
      user_id: userId,
      amount: riskAmount,
      channel: transaction.channel,
      transaction_count_24h: await this.transactionRepository.count({
        where: { senderWalletId: transaction.senderWalletId, createdAt: MoreThanOrEqual(since) },
      }),
      device_id: transaction.metadata?.deviceId ?? null,
      ip_address: transaction.metadata?.ipAddress ?? null,
      recipient_wallet_id: transaction.recipientWalletId,
      hour: new Date().getHours(),
      low_risk_threshold: lowThreshold,
      medium_risk_threshold: mediumThreshold,
    }
    const response = await axios.post<{
      risk_score: number
      risk_level: string
      decision: FraudRiskDecision
      reasons: string[]
      features?: Record<string, unknown>
    }>(
      `${baseUrl}/api/v1/fraud-detection/predict`,
      riskPayload,
      { headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } },
    )
    const riskScore = Number(response.data.risk_score ?? 0)
    if (!Number.isFinite(riskScore) || riskScore < 0 || riskScore > 100) {
      throw new BadRequestException('Le service de détection de fraude a renvoyé un score invalide')
    }
    const baseDecision = evaluateRiskDecision(riskScore, lowThreshold, mediumThreshold)
    if (response.data.decision !== baseDecision) {
      this.logger.warn(
        `Fraud service decision mismatch for payment ${transaction.id}: score ${riskScore}, `
        + `service decision ${response.data.decision}, configured decision ${baseDecision}`,
      )
    }
    const decisionReason = baseDecision === 'APPROVE'
      ? `Risque faible : score de ${riskScore.toFixed(1)}/100, validation automatique selon les seuils configurés.`
      : baseDecision === 'REQUIRE_2FA'
        ? `Risque intermédiaire : score de ${riskScore.toFixed(1)}/100, confirmation OTP requise selon les seuils configurés.`
        : `Risque élevé : score de ${riskScore.toFixed(1)}/100, transaction bloquée selon les seuils configurés.`
    return {
      riskScore,
      riskLevel: baseDecision === 'APPROVE' ? 'LOW' : baseDecision === 'REQUIRE_2FA' ? 'MEDIUM' : 'HIGH',
      decision: baseDecision,
      reasons: [...(response.data.reasons ?? []), decisionReason],
      reason: decisionReason,
      features: response.data.features
        ? {
            model: response.data.features.model,
            amount: response.data.features.amount,
            transaction_count_24h: response.data.features.transaction_count_24h,
            hour: response.data.features.hour,
            channel: response.data.features.channel,
          }
        : null,
    }

  }

  private getNumericCondition(value: unknown): number | null {
    const numericValue = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null
  }

  private getPositiveNumber(value: unknown): number | null {
    const numericValue = this.getNumericCondition(value)
    return numericValue !== null && numericValue > 0 ? numericValue : null
  }

  async process(transactionId: number, skipRiskEvaluation = false) {
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || transaction.status !== TransactionStatus.PENDING) return transaction

    try {
      if (!skipRiskEvaluation) {
        const risk = await this.evaluateTransactionRisk(transaction.senderWalletId, transaction)
        const transactionRule = await this.securityRuleRepository.findOne({ where: { ruleType: 'TRANSACTION_LIMIT', isActive: true }, order: { priority: 'DESC', updatedAt: 'DESC' } })
        const requirePaymentTwoFactor = transactionRule?.actions?.twoFactorEnabled === true
          || transaction.channel === PaymentChannel.BANK_TRANSFER
          || transaction.channel === PaymentChannel.CARD
        const qrTotpVerified = transaction.channel === PaymentChannel.QR
          && (transaction.metadata ?? {}).twoFactorVerified === true
        const effectiveDecision: FraudRiskDecision = qrTotpVerified && risk.decision !== 'BLOCK'
          ? 'APPROVE'
          : requirePaymentTwoFactor && risk.decision === 'APPROVE'
            ? 'REQUIRE_2FA'
            : risk.decision
        transaction.metadata = {
          ...transaction.metadata,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          riskDecision: effectiveDecision,
          riskReasons: risk.reasons,
          riskFeatures: risk.features,
        }
        transaction.riskScore = risk.riskScore
        transaction.riskLevel = risk.riskLevel
        await this.transactionRepository.save(transaction)

        if (effectiveDecision === 'BLOCK') {
          transaction.status = TransactionStatus.FAILED
          transaction.failureReason = 'Paiement bloqué par le contrôle de sécurité.'
          await this.transactionRepository.save(transaction)
          await this.notifyPaymentFailure(transaction)
          await this.fraudAlertRepository.save(
            this.fraudAlertRepository.create({
              transactionId: transaction.id,
              userId: (await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } }))?.userId ?? transaction.senderWalletId,
              riskScore: risk.riskScore,
              riskLevel: risk.riskLevel,
              reasons: risk.reasons.join(', '),
              status: 'OPEN',
            }),
          )
          return this.withoutSensitiveTransactionData(transaction)
        }
        if (effectiveDecision === 'REQUIRE_2FA') {
          const existingMetadata = (transaction.metadata ?? {}) as Record<string, unknown>
          const existingExpiry = typeof existingMetadata.twoFactorExpiresAt === 'string'
            ? Date.parse(existingMetadata.twoFactorExpiresAt)
            : 0
          if (existingExpiry > Date.now()) {
            transaction.status = TransactionStatus.PENDING
            transaction.failureReason = 'Vérification 2FA requise avant exécution.'
            await this.transactionRepository.save(transaction)
            return transaction
          }
          if (existingExpiry > 0) {
            transaction.status = TransactionStatus.FAILED
            transaction.failureReason = 'Le délai de confirmation 2FA est expiré.'
            await this.transactionRepository.save(transaction)
            await this.notifyPaymentFailure(transaction)
            return transaction
          }
          const { twoFactorCodeHash: _codeHash, ...safeMetadata } = existingMetadata
          transaction.metadata = {
            ...safeMetadata,
            twoFactorExpiresAt: new Date(Date.now() + PAYMENT_TWO_FACTOR_TTL_MS).toISOString(),
          }
          transaction.status = TransactionStatus.PENDING
          transaction.failureReason = 'Vérification 2FA requise avant exécution.'
          await this.transactionRepository.save(transaction)
          return transaction
        }
      }
      if (transaction.channel === PaymentChannel.QR && !((transaction.metadata ?? {}).qrConfirmedAt as string | undefined)) {
        return transaction
      }
      return this.withoutSensitiveTransactionData(await this.executePayment(transaction))
    } catch (error) {
      transaction.status = TransactionStatus.FAILED
      transaction.failureReason = error instanceof Error ? error.message : 'Paiement échoué'
      await this.transactionRepository.save(transaction)
      await this.notifyPaymentFailure(transaction)
    }
    return transaction
  }

  private decryptSensitiveMetadata(metadata: Record<string, unknown> | null) {
    if (!metadata) return metadata
    return Object.fromEntries(Object.entries(metadata).map(([key, value]) => {
      if (key === 'cardToken' && typeof value === 'string') {
        return [key, this.cryptoService.decrypt(value)]
      }
      return [key, value]
    }))
  }

  async processForUser(userId: number, transactionId: number) {
    await this.findOne(userId, transactionId)
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    const result = await this.process(transactionId)
    return result && wallet ? this.withoutQrConfirmationLinkForPayer(result, wallet.id) : null
  }

  async confirmTwoFactor(
    userId: number,
    transactionId: number,
    code: string,
    method: 'AUTHENTICATOR' | 'NOTIFICATION_OTP' = 'AUTHENTICATOR',
  ) {
    return this.completeTwoFactorPayment(userId, transactionId, code, method)
  }

  async requestNotificationOtp(userId: number, transactionId: number) {
    const { expiresAt } = await this.getPendingPaymentTwoFactor(userId, transactionId)
    const previousCode = await this.otpCodeRepository.findOne({
      where: { userId, transactionId, purpose: PAYMENT_NOTIFICATION_OTP_PURPOSE },
      order: { createdAt: 'DESC' },
    })
    const now = new Date()
    if (previousCode && now.getTime() - previousCode.createdAt.getTime() < PAYMENT_NOTIFICATION_OTP_RESEND_DELAY_MS) {
      throw new BadRequestException('Attendez une minute avant de demander un nouveau code')
    }

    await this.otpCodeRepository.update(
      { userId, transactionId, purpose: PAYMENT_NOTIFICATION_OTP_PURPOSE, isUsed: false },
      { isUsed: true, usedAt: now },
    )
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const otpExpiresAt = new Date(Math.min(now.getTime() + PAYMENT_NOTIFICATION_OTP_TTL_MS, expiresAt))
    const otp = this.otpCodeRepository.create({
      userId,
      transactionId,
      codeHash: await argon2.hash(code),
      purpose: PAYMENT_NOTIFICATION_OTP_PURPOSE,
      expiresAt: otpExpiresAt,
      isUsed: false,
      failedAttempts: 0,
      usedAt: null,
      ipAddress: null,
    })
    const savedOtp = await this.otpCodeRepository.save(otp)
    try {
      await this.notificationService.create(
        userId,
        'Code OTP de confirmation',
        `Votre code OTP pour le paiement #${transactionId} est ${code}. Il expire dans 2 minutes ou à l’expiration du paiement si celle-ci survient plus tôt.`,
      )
    } catch (error) {
      savedOtp.isUsed = true
      savedOtp.usedAt = new Date()
      await this.otpCodeRepository.save(savedOtp)
      throw error
    }

    return { sent: true, expiresAt: otpExpiresAt.toISOString() }
  }

  private async getPendingPaymentTwoFactor(userId: number, transactionId: number) {
    await this.findOne(userId, transactionId)
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction) throw new NotFoundException('Transaction non trouvée')
    if (transaction.channel === PaymentChannel.QR) {
      throw new BadRequestException('La confirmation QR ne prend pas en charge le code OTP par notification')
    }
    if (transaction.status !== TransactionStatus.PENDING || transaction.failureReason !== 'Vérification 2FA requise avant exécution.') {
      throw new BadRequestException('Cette transaction ne demande pas de confirmation 2FA')
    }

    const confirmationWallet = await this.walletRepository.findOne({ where: { id: transaction.senderWalletId } })
    if (!confirmationWallet || confirmationWallet.userId !== userId) {
      throw new BadRequestException('Seul l\'émetteur peut confirmer ce paiement')
    }
    const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
    const expiresAt = typeof metadata.twoFactorExpiresAt === 'string' ? Date.parse(metadata.twoFactorExpiresAt) : 0
    if (!expiresAt || expiresAt <= Date.now()) {
      throw new BadRequestException('Le délai de confirmation 2FA est expiré')
    }
    return { transaction, metadata, expiresAt }
  }

  private async completeTwoFactorPayment(
    userId: number,
    transactionId: number,
    code: string,
    method: 'AUTHENTICATOR' | 'NOTIFICATION_OTP',
  ) {
    const { transaction, metadata } = await this.getPendingPaymentTwoFactor(userId, transactionId)
    if (method === 'NOTIFICATION_OTP') {
      const otp = await this.otpCodeRepository.findOne({
        where: { userId, transactionId, purpose: PAYMENT_NOTIFICATION_OTP_PURPOSE, isUsed: false },
        order: { createdAt: 'DESC' },
      })
      if (!otp || otp.expiresAt <= new Date()) {
        if (otp) {
          otp.isUsed = true
          otp.usedAt = new Date()
          await this.otpCodeRepository.save(otp)
        }
        throw new BadRequestException('Le code e-mail est expiré ou introuvable. Demandez un nouveau code.')
      }
      if (otp.failedAttempts >= PAYMENT_NOTIFICATION_OTP_MAX_ATTEMPTS) {
        otp.isUsed = true
        otp.usedAt = new Date()
        await this.otpCodeRepository.save(otp)
        throw new BadRequestException('Trop de tentatives. Demandez un nouveau code.')
      }
      if (!(await argon2.verify(otp.codeHash, code.trim()))) {
        otp.failedAttempts += 1
        if (otp.failedAttempts >= PAYMENT_NOTIFICATION_OTP_MAX_ATTEMPTS) {
          otp.isUsed = true
          otp.usedAt = new Date()
        }
        await this.otpCodeRepository.save(otp)
        throw new BadRequestException('Code OTP invalide')
      }
      otp.isUsed = true
      otp.usedAt = new Date()
      await this.otpCodeRepository.save(otp)
    } else {
      const sender = await this.userRepository.findOne({ where: { id: userId } })
      if (!sender?.isTwoFactorEnabled || !sender.twoFactorSecret) {
        throw new BadRequestException('Activez Google Authenticator dans les paramètres de sécurité avant de confirmer ce paiement')
      }

      const verification = await totp.verify(code.trim(), { secret: sender.twoFactorSecret, epochTolerance: 30 })
      if (!verification.valid) {
        throw new BadRequestException('Code Google Authenticator invalide ou expiré')
      }
    }

    const { twoFactorCodeHash: _codeHash, twoFactorExpiresAt: _expiresAt, ...safeMetadata } = metadata
    transaction.metadata = { ...safeMetadata, twoFactorVerified: true, twoFactorVerifiedAt: new Date().toISOString() }
    transaction.failureReason = null
    await this.transactionRepository.save(transaction)
    const result = await this.process(transactionId, true)
    return result ? this.withoutSensitiveTransactionData(result) : null
  }

  async findHistory(userId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) return []
    const transactions = await this.transactionRepository.find({
      where: [{ senderWalletId: wallet.id }, { recipientWalletId: wallet.id }],
      order: { createdAt: 'DESC' },
    })
    return transactions.map((transaction) => ({
      ...this.withoutQrConfirmationLinkForPayer(transaction, wallet.id),
      direction: transaction.senderWalletId === wallet.id ? 'OUTGOING' : 'INCOMING',
    }))
  }

  async getTwoFactorStatus(userId: number, transactionId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || (transaction.senderWalletId !== wallet.id && transaction.recipientWalletId !== wallet.id)) {
      throw new NotFoundException('Transaction non trouvée')
    }
    const confirmationWalletId = transaction.channel === PaymentChannel.QR
      ? transaction.recipientWalletId
      : transaction.senderWalletId
    if (wallet.id !== confirmationWalletId) throw new NotFoundException('Transaction non trouvée')
    await this.expireTwoFactorIfNeeded(transaction)
    if (transaction.status !== 'PENDING' || transaction.failureReason !== 'Vérification 2FA requise avant exécution.') {
      return { requiresTwoFactor: false }
    }
    const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
    const expiresAt = typeof metadata.twoFactorExpiresAt === 'string' ? Date.parse(metadata.twoFactorExpiresAt) : 0
    const remainingSeconds = expiresAt > Date.now() ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 0
    return {
      requiresTwoFactor: true,
      remainingSeconds,
      expiresAt: metadata.twoFactorExpiresAt ?? null,
    }
  }

  async cancel(userId: number, transactionId: number) {
    const wallet = await this.walletRepository.findOne({ where: { userId } })
    if (!wallet) throw new NotFoundException('Portefeuille non trouvé')
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || transaction.senderWalletId !== wallet.id) {
      throw new NotFoundException('Transaction non trouvée')
    }
    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Seul un paiement en attente peut être annulé')
    }
    transaction.status = TransactionStatus.FAILED
    transaction.failureReason = 'Paiement annulé par l\'utilisateur'
    await this.transactionRepository.save(transaction)
    return this.withoutSensitiveTransactionData(transaction)
  }
}
