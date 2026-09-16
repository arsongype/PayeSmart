import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
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

  async process(transactionId: number) {
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } })
    if (!transaction || transaction.status !== TransactionStatus.PENDING) return transaction
    transaction.status = TransactionStatus.PROCESSING
    await this.transactionRepository.save(transaction)

    try {
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
