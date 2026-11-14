import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repository } from 'typeorm'
import { Notification } from '../entities/notification.entity.js'
import { NotificationService } from './notification.service.js'
import { Transaction } from '../../modules/auth/entities/transaction.entity.js'
import { PaymentChannel } from '../../modules/auth/enums/payment-channel.enum.js'
import { TransactionStatus } from '../../modules/auth/enums/transaction-status.enum.js'

describe('NotificationService', () => {
  const notificationRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
  }
  const transactionRepository = {
    find: vi.fn(),
  }
  const service = new NotificationService(
    notificationRepository as unknown as Repository<Notification>,
    transactionRepository as unknown as Repository<Transaction>,
  )

  beforeEach(() => {
    vi.clearAllMocks()
    transactionRepository.find.mockResolvedValue([])
  })

  it('creates a notification with an optional link', async () => {
    const notification = { userId: 7, title: 'Test', message: 'Message', link: null }
    notificationRepository.create.mockReturnValue(notification)
    notificationRepository.save.mockResolvedValue(notification)

    await expect(service.create(7, 'Test', 'Message')).resolves.toBe(notification)
    expect(notificationRepository.create).toHaveBeenCalledWith(notification)
    expect(notificationRepository.save).toHaveBeenCalledWith(notification)
  })

  it('loads the user notifications newest first', async () => {
    notificationRepository.find.mockResolvedValue([])

    await service.findByUserId(7)

    expect(notificationRepository.find).toHaveBeenCalledWith({
      where: { userId: 7 },
      order: { createdAt: 'DESC' },
    })
  })

  it.each([TransactionStatus.COMPLETED, TransactionStatus.FAILED])(
    'hides QR confirmation links after a payment reaches %s while retaining its notification',
    async (status) => {
      const notification = {
        id: 21,
        userId: 7,
        title: 'Demande de paiement QR',
        message: 'Confirmez le paiement',
        isRead: true,
        createdAt: new Date(),
        link: 'https://paysmart.test/payments/confirm/42',
      }
      notificationRepository.find.mockResolvedValue([notification])
      transactionRepository.find.mockResolvedValue([{ id: 42, channel: PaymentChannel.QR, status }])

      await expect(service.findByUserId(7)).resolves.toEqual([{ ...notification, link: null }])
    },
  )

  it('keeps QR confirmation links while the payment is pending', async () => {
    const notification = {
      id: 21,
      userId: 7,
      title: 'Demande de paiement QR',
      message: 'Confirmez le paiement',
      isRead: true,
      createdAt: new Date(),
      link: '/payments/confirm/42',
    }
    notificationRepository.find.mockResolvedValue([notification])
    transactionRepository.find.mockResolvedValue([{ id: 42, channel: PaymentChannel.QR, status: TransactionStatus.PENDING }])

    await expect(service.findByUserId(7)).resolves.toEqual([notification])
  })

  it('does not hide links associated with non-QR transactions', async () => {
    const notification = {
      id: 21,
      userId: 7,
      title: 'Action requise',
      message: 'Continuer',
      isRead: true,
      createdAt: new Date(),
      link: '/payments/confirm/42',
    }
    notificationRepository.find.mockResolvedValue([notification])
    transactionRepository.find.mockResolvedValue([{ id: 42, channel: PaymentChannel.BANK_TRANSFER, status: TransactionStatus.FAILED }])

    await expect(service.findByUserId(7)).resolves.toEqual([notification])
  })

  it('marks only the matching user notification as read and returns their list', async () => {
    const notifications = [{ id: 21, userId: 7, isRead: true }]
    notificationRepository.update.mockResolvedValue({ affected: 1 })
    notificationRepository.find.mockResolvedValue(notifications)

    await expect(service.markAsRead(7, 21)).resolves.toBe(notifications)
    expect(notificationRepository.update).toHaveBeenCalledWith(
      { id: 21, userId: 7 },
      { isRead: true },
    )
    expect(notificationRepository.find).toHaveBeenCalledWith({
      where: { userId: 7 },
      order: { createdAt: 'DESC' },
    })
  })

  it('marks only unread notifications belonging to the user as read', async () => {
    const notifications = [{ id: 21, userId: 7, isRead: true }]
    notificationRepository.update.mockResolvedValue({ affected: 1 })
    notificationRepository.find.mockResolvedValue(notifications)

    await expect(service.markAllAsRead(7)).resolves.toBe(notifications)
    expect(notificationRepository.update).toHaveBeenCalledWith(
      { userId: 7, isRead: false },
      { isRead: true },
    )
  })
})
