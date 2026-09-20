import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { PaymentsService } from './payments.service.js'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../auth/enums/kyb-status.enum.js'
import { Role } from '../auth/enums/role.enum.js'

const buildService = (role: Role = Role.USER, kycStatus = KycStatus.APPROVED, kybStatus = KybStatus.NON_VERIFIE) => {
  const sender = { id: 1, role, kycStatus, kybStatus }
  const recipient = { id: 2, phone: '0340000000', role: Role.USER }
  const senderWallet = { id: 11, userId: 1, status: 'ACTIVE', currency: 'EUR' }
  const recipientWallet = { id: 22, userId: 2, status: 'ACTIVE', currency: 'EUR' }
  const transactionRepository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 100, ...value })),
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
  const service = new PaymentsService(
    userRepository as never,
    walletRepository as never,
    transactionRepository as never,
    {} as never,
    {} as never,
    { create: vi.fn() } as never,
    {} as never,
    { get: () => 'http://localhost:5173' } as never,
    { encrypt: (value: string) => `enc:${value}` } as never,
  )
  ;(service as unknown as { redisQueue: { add: ReturnType<typeof vi.fn> } }).redisQueue = { add: vi.fn() }
  return { service, transactionRepository }
}

describe('payment channel contracts', () => {
  it.each([
    [PaymentChannel.ORANGE_MONEY, { phoneNumber: '0340000000' }],
    [PaymentChannel.CARD, { recipientWalletNumber: '2222222222', cardToken: 'tok_test' }],
    [PaymentChannel.QR, { recipientWalletNumber: '2222222222' }],
    [PaymentChannel.BANK_TRANSFER, { recipientWalletNumber: '2222222222', bankReference: 'REF-001' }],
  ])('accepts %s when its required destination data is present', async (channel, fields) => {
    const { service, transactionRepository } = buildService()

    await service.initiate(1, { amount: 25, channel, ...fields } as never)

    expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ channel, amount: 25 }))
  })

  it.each([
    [PaymentChannel.ORANGE_MONEY, {}],
  ])('rejects %s without a phone number', async (channel, fields) => {
    const { service } = buildService()

    await expect(service.initiate(1, { amount: 25, channel, ...fields } as never))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects card payments without a card token', async () => {
    const { service } = buildService()

    await expect(service.initiate(1, {
      amount: 25,
      channel: PaymentChannel.CARD,
      recipientWalletNumber: '2222222222',
    } as never)).rejects.toThrow('Le token de carte est requis')
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
})