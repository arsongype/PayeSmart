import { describe, expect, it, vi } from 'vitest'
import type { EntityManager, Repository } from 'typeorm'
import * as argon2 from 'argon2'
import { AccountManagementService } from './account-management.service.js'
import { User } from '../../modules/auth/entities/user.entity.js'
import { Role } from '../../modules/auth/enums/role.enum.js'
import { UserStatus } from '../../modules/auth/enums/user-status.enum.js'
import { KycDocument } from '../../modules/auth/entities/kyc-document.entity.js'
import { KybDocument } from '../../modules/auth/entities/kyb-document.entity.js'
import { Wallet } from '../../modules/auth/entities/wallet.entity.js'
import { Transaction } from '../../modules/auth/entities/transaction.entity.js'
import { FraudAlert } from '../../modules/auth/entities/fraud-alert.entity.js'
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js'
import { Notification } from '../../notifications/entities/notification.entity.js'
import { TransactionStatus } from '../../modules/auth/enums/transaction-status.enum.js'

describe('AccountManagementService account deletion', () => {
  const createService = async (blockers = false, resolvedHighRisk = false) => {
    const user = {
      id: 12,
      role: Role.USER,
      accountStatus: UserStatus.ACTIVE,
      passwordHash: await argon2.hash('correct-password'),
    } as User
    const users = {
      findOne: vi.fn().mockResolvedValue(user),
      find: vi.fn().mockResolvedValue([{ id: 1 }]),
      save: vi.fn(async (value: User) => value),
    }
    const wallets = {
      find: vi.fn().mockResolvedValue([{ id: 42 }]),
    }
    const transactions = {
      find: vi.fn()
        .mockResolvedValueOnce(blockers ? [{ id: 91, status: TransactionStatus.PROCESSING }] : [])
        .mockResolvedValueOnce(resolvedHighRisk ? [{ id: 15, riskScore: 82 }] : []),
    }
    const alerts = {
      find: vi.fn().mockResolvedValue([
        ...(blockers ? [{ id: 8, status: 'OPEN' }] : []),
        ...(resolvedHighRisk ? [{ id: 17, transactionId: 15, status: 'RESOLVED' }] : []),
      ]),
    }
    const refreshTokens = { delete: vi.fn() }
    const notifications = {
      create: vi.fn((value: Partial<Notification>) => value),
      save: vi.fn((value: unknown) => Promise.resolve(value)),
    }
    const manager = {
      getRepository: vi.fn((entity: unknown) => {
        if (entity === User) return users
        if (entity === Wallet) return wallets
        if (entity === Transaction) return transactions
        if (entity === FraudAlert) return alerts
        if (entity === RefreshToken) return refreshTokens
        if (entity === Notification) return notifications
        throw new Error('Unexpected repository')
      }),
    }
    const userRepository = {
      manager: {
        transaction: vi.fn((callback: (manager: EntityManager) => Promise<unknown>) => callback(manager as unknown as EntityManager)),
      },
    }
    const service = new AccountManagementService(
      userRepository as unknown as Repository<User>,
      {} as Repository<KycDocument>,
      {} as Repository<KybDocument>,
      { create: vi.fn() } as never,
    )
    return { service, user, users, transactions, alerts, refreshTokens, notifications }
  }

  it('schedules a 30-day deletion and revokes refresh tokens when checks pass', async () => {
    const { service, user, users, refreshTokens, notifications } = await createService()
    const before = Date.now()

    const result = await service.requestOwnDeletion(user.id, 'correct-password')

    expect(result.status).toBe('scheduled')
    expect(result.reactivationDeadline!.getTime() - before).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000)
    expect(user.accountStatus).toBe(UserStatus.DELETED)
    expect(refreshTokens.delete).toHaveBeenCalledWith({ userId: user.id })
    expect(users.save).toHaveBeenCalledWith(user)
    expect(notifications.save).toHaveBeenCalledOnce()
  })

  it('blocks deletion when an open fraud alert or an in-progress transaction exists', async () => {
    const { service, user, users, transactions, notifications } = await createService(true)

    const result = await service.requestOwnDeletion(user.id, 'correct-password')

    expect(result.status).toBe('blocked')
    expect(result.reasons).toContain('Alerte de fraude non résolue (#8)')
    expect(result.reasons).toContain('1 opération(s) en cours')
    expect(user.accountStatus).toBe(UserStatus.ACTIVE)
    expect(users.save).not.toHaveBeenCalled()
    expect(transactions.find).toHaveBeenCalledTimes(2)
    expect(notifications.save).toHaveBeenCalledOnce()
  })

  it('lets an admin cancel a pending deletion before the deadline', async () => {
    const { service, user, users } = await createService()
    user.accountStatus = UserStatus.DELETED
    user.deletionPreviousStatus = UserStatus.SUSPENDED
    user.suspensionReason = 'Review required'
    user.reactivationDeadline = new Date(Date.now() + 60_000)

    await service.cancelDeletion(user.id, 1)

    expect(user.accountStatus).toBe(UserStatus.SUSPENDED)
    expect(user.suspensionReason).toBe('Review required')
    expect(user.deletionPreviousStatus).toBeNull()
    expect(user.reactivationDeadline).toBeNull()
    expect(users.save).toHaveBeenCalledWith(user)
  })

  it('rejects restoration at or after the deadline', async () => {
    const { service, user, users } = await createService()
    user.accountStatus = UserStatus.DELETED
    user.reactivationDeadline = new Date(Date.now() - 1)

    await expect(service.cancelDeletion(user.id, 1)).rejects.toThrow('La période de grâce de 30 jours est expirée')

    expect(user.accountStatus).toBe(UserStatus.DELETED)
    expect(users.save).not.toHaveBeenCalled()
  })

  it('allows deletion after an administrator resolves a high-risk transaction', async () => {
    const { service, user } = await createService(false, true)

    const result = await service.requestOwnDeletion(user.id, 'correct-password')

    expect(result.status).toBe('scheduled')
    expect(user.accountStatus).toBe(UserStatus.DELETED)
  })
})
