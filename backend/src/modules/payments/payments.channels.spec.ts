import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { PaymentsService } from './payments.service.js'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../auth/enums/kyb-status.enum.js'
import { Role } from '../auth/enums/role.enum.js'

const buildService = (
  role: Role = Role.USER,
  kycStatus = KycStatus.APPROVED,
  kybStatus = KybStatus.NON_VERIFIE,
  conditions: Record<string, unknown> = {},
  recentAttempts = 0,
  existingPayments: Array<{ amount: number; totalAmount: number; createdAt: Date }> = [],
) => {
  const sender = { id: 1, role, kycStatus, kybStatus }
  const recipient = { id: 2, phone: '0340000000', role: Role.USER }
  const senderWallet = { id: 11, userId: 1, status: 'ACTIVE', currency: 'EUR' }
  const recipientWallet = { id: 22, userId: 2, status: 'ACTIVE', currency: 'EUR' }
  const transactionRepository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 100, ...value })),
    findOne: vi.fn(async () => null as never),
    count: vi.fn(async () => recentAttempts),
    find: vi.fn(async () => existingPayments),
  }
  const userRepository = {
    findOne: vi.fn(async () => sender),
    find: vi.fn(async () => [recipient]),
  }
  const walletRepository = {
    findOne: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.userId === 1) return senderWallet
      if (where.userId === 2 || where.walletNumber === '2222222222') return recipientWallet
      return null
    }),
  }
  const securityRuleRepository = {
    findOne: vi.fn(async () => Object.keys(conditions).length > 0 ? { conditions } : null),
  }
  const notificationService = { create: vi.fn() }
  const service = new PaymentsService(
    userRepository as never,
    walletRepository as never,
    transactionRepository as never,
    {} as never,
    {} as never,
    securityRuleRepository as never,
    {} as never,
    notificationService as never,
    { authorize: vi.fn() } as never,
    { get: () => 'http://localhost:5173' } as never,
    { encrypt: (value: string) => `enc:${value}` } as never,
  )
  ;(service as unknown as { redisQueue: { add: ReturnType<typeof vi.fn> } }).redisQueue = { add: vi.fn() }
  return { service, transactionRepository, notificationService }
}

describe('payment channel contracts', () => {
  it.each([
    [PaymentChannel.CARD, { recipientWalletNumber: '2222222222', cardToken: 'tok_test_simulated' }],
    [PaymentChannel.QR, { recipientWalletNumber: '2222222222' }],
    [PaymentChannel.BANK_TRANSFER, { recipientWalletNumber: '2222222222' }],
  ])('accepts %s when its required destination data is present', async (channel, fields) => {
    const { service, transactionRepository, notificationService } = buildService()

    const transaction = await service.initiate(1, { amount: 25, channel, ...fields } as never)

    expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ channel, amount: 25 }))
    if (channel === PaymentChannel.QR) {
      expect(transaction.metadata).not.toHaveProperty('qrData')
      expect(notificationService.create).toHaveBeenCalledWith(
        2,
        'Demande de paiement QR',
        expect.stringContaining('Scannez ce QR code'),
        'http://localhost:5173/payments/confirm/100',
      )
    }
  })

  it.each([
    [PaymentChannel.ORANGE_MONEY, {}],
  ])('rejects %s without a phone number', async (channel, fields) => {
    const { service } = buildService()

    await expect(service.initiate(1, { amount: 25, channel, ...fields } as never))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects card payments without a sandbox test token', async () => {
    const { service } = buildService()

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
    } as never)).rejects.toThrow('token de carte de test sandbox')

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'real-card-token',
    } as never)).rejects.toThrow('token de carte de test sandbox')
  })

  it('requires approved KYC for a regular user', async () => {
    const { service } = buildService(Role.USER, KycStatus.EN_COURS)

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.QR,
      recipientWalletNumber: '2222222222',
    } as never)).rejects.toThrow('Vérification KYC/KYB requise')
  })

  it('requires approved KYC and KYB for a merchant', async () => {
    const { service } = buildService(Role.MERCHANT, KycStatus.APPROVED, KybStatus.EN_COURS)

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.BANK_TRANSFER,
      recipientWalletNumber: '2222222222',
    } as never)).rejects.toThrow('Vérification KYC/KYB requise')
  })

  it('adds the default sender fee to the total debit', async () => {
    const { service, transactionRepository } = buildService()

    const transaction = await service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'tok_test_simulated',
    } as never)

    expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ feeAmount: 0.25, totalAmount: 25.25 }))
    expect(transaction.metadata).not.toHaveProperty('cardToken')
    expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ cardToken: 'enc:tok_test_simulated' }),
    }))
  })

  it('converts payer-selected currency into sender and recipient wallet currencies', async () => {
    const { service, transactionRepository } = buildService()

    await service.initiate(1, {
      amount: 50000,
      currency: 'MGA',
      channel: PaymentChannel.BANK_TRANSFER,
      recipientWalletNumber: '2222222222',
    } as never)

    expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 50000,
      currency: 'MGA',
      metadata: expect.objectContaining({
        senderDebitAmount: 10.1,
        recipientCreditAmount: 10,
        senderCurrency: 'EUR',
        recipientCurrency: 'EUR',
      }),
    }))
  })

  it('quotes the chosen currency and shows the debit in the wallet currency', async () => {
    const { service } = buildService()

    await expect(service.quote(1, { amount: 50000, currency: 'MGA' } as never))
      .resolves.toMatchObject({
        amount: 50000,
        feeAmount: 500,
        totalAmount: 50500,
        currency: 'MGA',
        walletCurrency: 'EUR',
        walletDebitAmount: 10.1,
      })
  })

  it('lets the recipient confirm a QR payment after opening its notification link', async () => {
    const qrTransaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.QR,
      status: 'PENDING',
      metadata: {},
    }
    const { service, transactionRepository } = buildService()
    transactionRepository.findOne.mockResolvedValue(qrTransaction as never)
    const processPayment = vi.spyOn(service, 'process').mockResolvedValue(qrTransaction as never)

    await service.confirmQr(2, 100)

    expect(qrTransaction.metadata).toHaveProperty('qrConfirmedAt')
    expect(processPayment).toHaveBeenCalledWith(100)
  })

  it('does not let the payer confirm a QR payment on behalf of the recipient', async () => {
    const { service, transactionRepository } = buildService()
    const qrTransaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.QR,
      status: 'PENDING',
      metadata: {},
    }
    transactionRepository.findOne.mockResolvedValue(qrTransaction as never)

    await expect(service.confirmQr(1, 100)).rejects.toThrow('Seul le destinataire peut confirmer')
    await expect(service.findQrConfirmation(1, 100)).rejects.toThrow('Transaction non trouvée')
  })

  it('only serves the QR confirmation details to the recipient account', async () => {
    const { service, transactionRepository } = buildService()
    const qrTransaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.QR,
      status: 'PENDING',
      metadata: {},
    }
    transactionRepository.findOne.mockResolvedValue(qrTransaction as never)
    const findOne = vi.spyOn(service, 'findOne').mockResolvedValue({
      ...qrTransaction,
      canConfirmQr: true,
    } as never)

    await expect(service.findQrConfirmation(2, 100)).resolves.toMatchObject({ canConfirmQr: true })
    expect(findOne).toHaveBeenCalledWith(2, 100)
  })

  it.each([
    [{ transactionLimit: 24 }, 'Le plafond de transaction est dépassé'],
    [{ dailyLimit: 25 }, 'Le plafond journalier global est dépassé'],
    [{ monthlyLimit: 25 }, 'Le plafond mensuel global est dépassé'],
  ])('enforces configured global payment limits', async (conditions, expectedError) => {
    const { service } = buildService(Role.USER, KycStatus.APPROVED, KybStatus.NON_VERIFIE, conditions)

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'tok_test_simulated',
    } as never)).rejects.toThrow(expectedError)
  })

  it('enforces the configured hourly payment attempt limit', async () => {
    const { service } = buildService(Role.USER, KycStatus.APPROVED, KybStatus.NON_VERIFIE, { paymentAttempts: 1 }, 1)

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'tok_test_simulated',
    } as never)).rejects.toThrow('Le nombre maximal de tentatives de paiement par heure est atteint')
  })

  it('reserves pending payments against the configured daily cap', async () => {
    const { service } = buildService(
      Role.USER,
      KycStatus.APPROVED,
      KybStatus.NON_VERIFIE,
      { dailyLimit: 100 },
      0,
      [{ amount: 30, totalAmount: 30, createdAt: new Date() }],
    )

    await expect(service.initiate(1, {
      amount: 70,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'tok_test_simulated',
    } as never)).rejects.toThrow('Le plafond journalier global est dépassé')
  })

  it('applies configured percentage, fixed, minimum and maximum fees', async () => {
    const { service, transactionRepository } = buildService(
      Role.USER,
      KycStatus.APPROVED,
      KybStatus.NON_VERIFIE,
      { percentage: 2, fixedAmount: 1, minimumFee: 3, maximumFee: 5 },
    )

    await service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'tok_test_simulated',
    } as never)

    expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ feeAmount: 3, totalAmount: 28 }))

    await service.initiate(1, {
      amount: 1000,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
      cardToken: 'tok_test_simulated',
    } as never)
    expect(transactionRepository.create).toHaveBeenLastCalledWith(expect.objectContaining({ feeAmount: 5, totalAmount: 1005 }))
  })
})