import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { KycStatus } from '../auth/enums/kyc-status.enum.js'
import { UserStatus } from '../auth/enums/user-status.enum.js'
import { WalletStatus } from '../auth/enums/wallet-status.enum.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { WithdrawalMethod } from './withdrawal-method.enum.js'
import { WithdrawalStatus } from './withdrawal-status.enum.js'
import { WithdrawalsService } from './withdrawals.service.js'

function createServiceFixture() {
  const wallet = { id: 8, userId: 4, balance: 20.25, currency: 'EUR', status: WalletStatus.ACTIVE }
  const user = {
    id: 4,
    accountStatus: UserStatus.ACTIVE,
    kycStatus: KycStatus.APPROVED,
    role: 'USER',
  }
  const request = {
    id: 12,
    userId: 4,
    walletId: 8,
    amount: 10.1,
    currency: 'EUR',
    countryCode: 'MG',
    method: WithdrawalMethod.ORANGE_MONEY,
    destinationCiphertext: 'cipher:{"recipientName":"User","account":"+261341234567"}',
    status: WithdrawalStatus.PENDING,
    adminNote: null,
    reviewedBy: null,
    reviewedAt: null,
    paidBy: null,
    paidAt: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  }
  const walletRepository = {
    findOne: vi.fn(async () => wallet),
    save: vi.fn(async (value) => value),
  }
  const requestRepository = {
    findOne: vi.fn(async () => request),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value),
  }
  const userRepository = {
    findOneBy: vi.fn(async () => user),
  }
  const manager = {
    getRepository: vi.fn((entity: unknown) => entity === Wallet ? walletRepository : entity === User ? userRepository : requestRepository),
  }
  const dataSource = {
    transaction: vi.fn(async (callback: (txManager: typeof manager) => unknown) => callback(manager)),
  }
  const profileRepository = {
    findOne: vi.fn(async () => ({ country: 'MG' })),
  }
  const cryptoService = {
    encrypt: vi.fn((value: string) => `cipher:${value}`),
    decrypt: vi.fn((value: string) => value.replace(/^cipher:/, '')),
  }

  const service = new WithdrawalsService(
    requestRepository as never,
    profileRepository as never,
    { findOne: vi.fn() } as never,
    dataSource as never,
    cryptoService as never,
  )

  return { service, wallet, request, walletRepository, requestRepository, manager, cryptoService }
}

describe('WithdrawalsService', () => {
  it('reserves the exact amount in cents and encrypts the payout destination', async () => {
    const fixture = createServiceFixture()

    await fixture.service.create(4, {
      amount: 10.1,
      method: WithdrawalMethod.ORANGE_MONEY,
      recipientName: ' User ',
      destinationAccount: '+261341234567',
    })

    expect(fixture.wallet.balance).toBe(10.15)
    expect(fixture.walletRepository.save).toHaveBeenCalledOnce()
    expect(fixture.cryptoService.encrypt).toHaveBeenCalledWith(
      JSON.stringify({ recipientName: 'User', account: '+261341234567' }),
    )
    expect(fixture.requestRepository.save).toHaveBeenCalledOnce()
  })

  it('only offers Orange Money as a withdrawal method', async () => {
    const fixture = createServiceFixture()

    await expect(fixture.service.getOptions(4)).resolves.toEqual({
      countryCode: 'MG',
      methods: [WithdrawalMethod.ORANGE_MONEY],
    })
  })

  it('simulates admin approval and manual payment without changing the reserved balance', async () => {
    const fixture = createServiceFixture()
    fixture.wallet.balance = 10.15

    await fixture.service.approve(12, 9)
    expect(fixture.request.status).toBe(WithdrawalStatus.APPROVED)
    expect(fixture.wallet.balance).toBe(10.15)

    await fixture.service.markPaid(12, 9, 'Simulation payout')
    expect(fixture.request.status).toBe(WithdrawalStatus.PAID)
    expect(fixture.request.paidBy).toBe(9)
    expect(fixture.request.adminNote).toBe('Simulation payout')
    expect(fixture.wallet.balance).toBe(10.15)
    expect(fixture.walletRepository.save).not.toHaveBeenCalled()
  })

  it('refunds a rejected request once and refuses a second refund', async () => {
    const fixture = createServiceFixture()
    fixture.request.status = WithdrawalStatus.APPROVED
    fixture.wallet.balance = 5.2

    await fixture.service.reject(12, 9, 'Invalid destination')
    expect(fixture.wallet.balance).toBe(15.3)
    expect(fixture.request.status).toBe(WithdrawalStatus.REJECTED)
    expect(fixture.walletRepository.save).toHaveBeenCalledOnce()

    await expect(fixture.service.reject(12, 9, 'Duplicate refund')).rejects.toBeInstanceOf(BadRequestException)
    expect(fixture.walletRepository.save).toHaveBeenCalledOnce()
  })
})
