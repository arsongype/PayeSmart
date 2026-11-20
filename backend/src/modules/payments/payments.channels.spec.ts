import { BadRequestException } from '@nestjs/common'
import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'
import * as argon2 from 'argon2'
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib'
import { PaymentsService } from './payments.service.js'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../auth/enums/kyb-status.enum.js'
import { Role } from '../auth/enums/role.enum.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { Ledger } from '../auth/entities/ledger.entity.js'

const testTotp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() })
const testTotpSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'

const buildService = (
  role: Role = Role.USER,
  kycStatus = KycStatus.APPROVED,
  kybStatus = KybStatus.NON_VERIFIE,
  conditions: Record<string, unknown> = {},
  recentAttempts = 0,
  existingPayments: Array<{ amount: number; totalAmount: number; createdAt: Date }> = [],
) => {
  const sender = {
    id: 1,
    firstName: 'Alice',
    lastName: 'Sender',
    email: 'alice@example.com',
    isEmailVerified: true,
    role,
    kycStatus,
    kybStatus,
    isTwoFactorEnabled: true,
    twoFactorSecret: testTotpSecret,
  }
  const recipient = {
    id: 2,
    firstName: 'Bob',
    lastName: 'Recipient',
    phone: '0340000000',
    role: Role.USER,
    isTwoFactorEnabled: true,
    twoFactorSecret: testTotpSecret,
  }
  const admin = { id: 3, role: Role.ADMIN, accountStatus: 'ACTIVE' }
  const senderWallet = { id: 11, userId: 1, cardHolderName: 'Alice Sender', status: 'ACTIVE', currency: 'EUR', balance: 100 }
  const recipientWallet = { id: 22, userId: 2, cardHolderName: 'Bob Recipient', status: 'ACTIVE', currency: 'EUR', balance: 100 }
  const adminWallet = { id: 33, userId: 3, cardHolderName: 'Admin User', status: 'ACTIVE', currency: 'MGA', balance: 0 }
  const wallets = [senderWallet, recipientWallet, adminWallet]
  const manager = {
    findOne: vi.fn(async (entity: unknown, options: { where: Record<string, unknown> }) => {
      if (entity !== Wallet) return null
      return wallets.find((wallet) => wallet.id === options.where.id || wallet.userId === options.where.userId) ?? null
    }),
    find: vi.fn(async (entity: unknown) => entity === User ? [admin] : []),
    create: vi.fn((_entity: unknown, value: Record<string, unknown>) => value),
    save: vi.fn(async (...args: unknown[]) => Array.isArray(args[0]) ? args[0] : args[1] ?? args[0]),
  }
  const dataSource = { transaction: vi.fn(async (work: (manager: typeof manager) => Promise<void>) => work(manager)) }
  const transactionRepository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 100, ...value })),
    findOne: vi.fn(async () => null as never),
    count: vi.fn(async () => recentAttempts),
    find: vi.fn(async () => existingPayments),
  }
  const userRepository = {
    findOne: vi.fn(async ({ where }: { where: Record<string, unknown> }) => where.id === recipient.id ? recipient : sender),
    find: vi.fn(async () => [recipient]),
  }
  const walletRepository = {
    findOne: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.userId === 1) return senderWallet
      if (where.userId === 2 || where.walletNumber === '2222222222') return recipientWallet
      if (where.id === 11) return senderWallet
      if (where.id === 22) return recipientWallet
      return null
    }),
  }
  const securityRuleRepository = {
    findOne: vi.fn(async () => Object.keys(conditions).length > 0 ? { conditions } : null),
  }
  const notificationService = { create: vi.fn() }
  const otpCodeRepository = {
    create: vi.fn((value) => value),
    findOne: vi.fn(async () => null as never),
    save: vi.fn(async (value) => value),
    update: vi.fn(async () => ({ affected: 0 })),
  }
  const fraudAlertRepository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value),
  }
  const sandboxGateway = { authorize: vi.fn(async () => ({ providerReference: 'PROVIDER-100' })) }
  const service = new PaymentsService(
    userRepository as never,
    walletRepository as never,
    transactionRepository as never,
    {} as never,
    fraudAlertRepository as never,
    securityRuleRepository as never,
    otpCodeRepository as never,
    dataSource as never,
    notificationService as never,
    sandboxGateway as never,
    { get: () => 'http://localhost:5173', getOrThrow: () => 'test-ai-key' } as never,
    { encrypt: (value: string) => `enc:${value}` } as never,
  )
  ;(service as unknown as { redisQueue: { add: ReturnType<typeof vi.fn> } }).redisQueue = { add: vi.fn() }
  return { service, transactionRepository, otpCodeRepository, notificationService, manager, senderWallet, recipientWallet, adminWallet, fraudAlertRepository, sandboxGateway }
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
        expect.stringContaining('Google Authenticator'),
        'http://localhost:5173/payments/confirm/100',
      )
    }
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

  it('credits the admin fee wallet, records the fee, and notifies the admin', async () => {
    const { service, transactionRepository, notificationService, manager, senderWallet, recipientWallet, adminWallet } = buildService()
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      amount: 25,
      feeAmount: 0.25,
      totalAmount: 25.25,
      currency: 'EUR',
      channel: PaymentChannel.BANK_TRANSFER,
      status: 'PENDING',
      externalReference: 'PAY-100',
      failureReason: null,
      metadata: { senderDebitAmount: 25.25, recipientCreditAmount: 25 },
    }
    transactionRepository.findOne.mockResolvedValue(transaction as never)

    await service.process(100, true)

    expect(senderWallet.balance).toBe(74.75)
    expect(recipientWallet.balance).toBe(125)
    expect(adminWallet.balance).toBe(1250)
    expect(manager.save).toHaveBeenCalledWith(Ledger, expect.arrayContaining([
      expect.objectContaining({ walletId: 33, amount: 1250, currency: 'MGA', direction: 'CREDIT', entryReference: 'PROVIDER-100-FEE' }),
    ]))
    expect(notificationService.create).toHaveBeenCalledWith(
      3,
      'Frais de transaction reçus',
      'Frais de transaction de 1250.00 MGA reçus pour le paiement de Alice Sender vers Bob Recipient (#100).',
    )
    expect(notificationService.create).toHaveBeenCalledWith(
      1,
      'Paiement réussi',
      'Votre paiement de 25.00 EUR vers Bob Recipient a réussi.',
    )
    expect(notificationService.create).toHaveBeenCalledWith(
      2,
      'Paiement reçu',
      'Vous avez reçu 25.00 EUR de Alice Sender.',
    )
  })

  it('notifies the payer when the fraud rules block a payment', async () => {
    const { service, transactionRepository, notificationService, fraudAlertRepository } = buildService()
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      amount: 25,
      currency: 'EUR',
      channel: PaymentChannel.QR,
      status: 'PENDING',
      failureReason: null,
      metadata: {},
    }
    transactionRepository.findOne.mockResolvedValue(transaction as never)
    Object.assign(service, {
      evaluateTransactionRisk: vi.fn().mockResolvedValue({
        riskScore: 93.1,
        riskLevel: 'HIGH',
        decision: 'BLOCK',
        reasons: ['Risque élevé détecté.'],
        reason: 'Risque élevé détecté.',
      }),
    })

    await service.process(100)

    expect(transaction.status).toBe('FAILED')
    expect(fraudAlertRepository.save).toHaveBeenCalled()
    expect(notificationService.create).toHaveBeenCalledWith(
      1,
      'Paiement bloqué',
      'Paiement #100 bloqué : contrôle de sécurité requis.',
    )
  })

  it('notifies the payer when payment execution fails', async () => {
    const { service, transactionRepository, notificationService, sandboxGateway } = buildService()
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      amount: 25,
      currency: 'EUR',
      channel: PaymentChannel.BANK_TRANSFER,
      status: 'PENDING',
      failureReason: null,
      metadata: {},
    }
    transactionRepository.findOne.mockResolvedValue(transaction as never)
    sandboxGateway.authorize.mockRejectedValue(new Error('Solde insuffisant'))

    await service.process(100, true)

    expect(transaction.status).toBe('FAILED')
    expect(notificationService.create).toHaveBeenCalledWith(
      1,
      'Paiement échoué',
      'Paiement #100 échoué : solde insuffisant.',
    )
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

  it('lets the recipient confirm a QR payment with their Google Authenticator code', async () => {
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

    const code = await testTotp.generate({ secret: testTotpSecret })
    await service.confirmQr(2, 100, code)

    expect(qrTransaction.metadata).toHaveProperty('qrConfirmedAt')
    expect(qrTransaction.metadata).toHaveProperty('twoFactorVerified', true)
    expect(processPayment).toHaveBeenCalledWith(100)
  })

  it('lets the sender confirm a payment with their Google Authenticator code', async () => {
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.CARD,
      status: 'PENDING',
      failureReason: 'Vérification 2FA requise avant exécution.',
      metadata: {
        riskScore: 40,
        riskLevel: 'MEDIUM',
        twoFactorExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    }
    const { service, transactionRepository } = buildService()
    transactionRepository.findOne.mockResolvedValue(transaction as never)
    const processPayment = vi.spyOn(service, 'process').mockResolvedValue(transaction as never)
    const code = await testTotp.generate({ secret: testTotpSecret })

    await service.confirmTwoFactor(1, 100, code)

    expect(transaction.metadata).toHaveProperty('twoFactorVerified', true)
    expect(processPayment).toHaveBeenCalledWith(100, true)
  })

  it('sends an expiring OTP through the existing notification service', async () => {
    vi.useFakeTimers()
    const requestedAt = new Date('2026-11-13T00:00:00.000Z')
    vi.setSystemTime(requestedAt)
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.CARD,
      status: 'PENDING',
      failureReason: 'Vérification 2FA requise avant exécution.',
      metadata: {
        riskScore: 40,
        riskLevel: 'MEDIUM',
        twoFactorExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      },
    }
    const { service, transactionRepository, otpCodeRepository, notificationService } = buildService()
    transactionRepository.findOne.mockResolvedValue(transaction as never)

    try {
      const result = await service.requestNotificationOtp(1, 100)
      expect(result.sent).toBe(true)
      expect(Date.parse(result.expiresAt)).toBe(requestedAt.getTime() + 2 * 60_000)
      expect(otpCodeRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: 1,
        transactionId: 100,
        purpose: 'PAYMENT_CONFIRMATION',
        isUsed: false,
        failedAttempts: 0,
      }))
      const [userId, title, message] = notificationService.create.mock.calls[0]
      expect(userId).toBe(1)
      expect(title).toContain('OTP')
      expect(message).toContain('#100')
      expect(message).toMatch(/\b\d{6}\b/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets the payer confirm a payment with the notification OTP', async () => {
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.CARD,
      status: 'PENDING',
      failureReason: 'Vérification 2FA requise avant exécution.',
      metadata: {
        riskScore: 40,
        riskLevel: 'MEDIUM',
        twoFactorExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    }
    const otp = {
      codeHash: await argon2.hash('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      failedAttempts: 0,
      isUsed: false,
      usedAt: null,
    }
    const { service, transactionRepository, otpCodeRepository } = buildService()
    transactionRepository.findOne.mockResolvedValue(transaction as never)
    otpCodeRepository.findOne.mockResolvedValue(otp as never)
    const processPayment = vi.spyOn(service, 'process').mockResolvedValue(transaction as never)

    await service.confirmTwoFactor(1, 100, '123456', 'NOTIFICATION_OTP')

    expect(otp.isUsed).toBe(true)
    expect(transaction.metadata).toHaveProperty('twoFactorVerified', true)
    expect(processPayment).toHaveBeenCalledWith(100, true)
  })

  it('invalidates a notification OTP after five failed confirmation attempts', async () => {
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.CARD,
      status: 'PENDING',
      failureReason: 'Vérification 2FA requise avant exécution.',
      metadata: {
        riskScore: 40,
        riskLevel: 'MEDIUM',
        twoFactorExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    }
    const otp = {
      codeHash: await argon2.hash('999999'),
      expiresAt: new Date(Date.now() + 60_000),
      failedAttempts: 4,
      isUsed: false,
      usedAt: null,
    }
    const { service, transactionRepository, otpCodeRepository } = buildService()
    transactionRepository.findOne.mockResolvedValue(transaction as never)
    otpCodeRepository.findOne.mockResolvedValue(otp as never)

    await expect(service.confirmTwoFactor(1, 100, '123456', 'NOTIFICATION_OTP')).rejects.toThrow('Code OTP invalide')

    expect(otp.failedAttempts).toBe(5)
    expect(otp.isUsed).toBe(true)
  })

  it('requires the sender to enable Google Authenticator before confirming a payment', async () => {
    const transaction = {
      id: 100,
      senderWalletId: 11,
      recipientWalletId: 22,
      channel: PaymentChannel.CARD,
      status: 'PENDING',
      failureReason: 'Vérification 2FA requise avant exécution.',
      metadata: {
        riskScore: 40,
        riskLevel: 'MEDIUM',
        twoFactorExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    }
    const { service, transactionRepository } = buildService()
    transactionRepository.findOne.mockResolvedValue(transaction as never)
    const userRepository = (service as unknown as { userRepository: { findOne: ReturnType<typeof vi.fn> } }).userRepository
    userRepository.findOne.mockResolvedValue({ isTwoFactorEnabled: false, twoFactorSecret: null })

    await expect(service.confirmTwoFactor(1, 100, '123456')).rejects.toThrow('Activez Google Authenticator')
  })

  it('uses the configured thresholds when the AI service decision is stale', async () => {
    const { service } = buildService(
      Role.USER,
      KycStatus.APPROVED,
      KybStatus.NON_VERIFIE,
      { lowRiskThreshold: 0.3, mediumRiskThreshold: 0.7 },
    )
    const predict = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        risk_score: 73.8,
        risk_level: 'MEDIUM',
        decision: 'REQUIRE_2FA',
        reasons: ['Risque élevé détecté.'],
      },
    } as never)
    const evaluateRisk = (service as unknown as {
      evaluateTransactionRisk: (userId: number, transaction: Record<string, unknown>) => Promise<{ decision: string; riskScore: number }>
    }).evaluateTransactionRisk

    try {
      await expect(evaluateRisk.call(service, 1, {
        id: 100,
        senderWalletId: 11,
        recipientWalletId: 22,
        amount: 1,
        currency: 'EUR',
        channel: PaymentChannel.CARD,
        metadata: {},
      })).resolves.toMatchObject({ riskScore: 73.8, decision: 'BLOCK' })
    } finally {
      predict.mockRestore()
    }
  })

  it('rejects QR confirmation when the Google Authenticator code is invalid', async () => {
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

    await expect(service.confirmQr(2, 100, '000000')).rejects.toThrow('Code Google Authenticator invalide')
  })

  it('requires the recipient to enable Google Authenticator before QR confirmation', async () => {
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
    const userRepository = (service as unknown as { userRepository: { findOne: ReturnType<typeof vi.fn> } }).userRepository
    userRepository.findOne.mockResolvedValue({ isTwoFactorEnabled: false, twoFactorSecret: testTotpSecret })

    await expect(service.confirmQr(2, 100, '123456')).rejects.toThrow('Activez Google Authenticator')
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

    await expect(service.confirmQr(1, 100, '123456')).rejects.toThrow('Seul le destinataire peut confirmer')
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