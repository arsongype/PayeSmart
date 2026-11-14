import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Notification } from '../entities/notification.entity.js'
import { Transaction } from '../../modules/auth/entities/transaction.entity.js'
import { PaymentChannel } from '../../modules/auth/enums/payment-channel.enum.js'
import { TransactionStatus } from '../../modules/auth/enums/transaction-status.enum.js'

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private repository: Repository<Notification>,
    @InjectRepository(Transaction) private transactionRepository: Repository<Transaction>,
  ) {}

  create(userId: number, title: string, message: string, link?: string) {
    return this.repository.save(this.repository.create({ userId, title, message, link: link ?? null }))
  }

  async findByUserId(userId: number) {
    const notifications = await this.repository.find({ where: { userId }, order: { createdAt: 'DESC' } })
    const transactionIds = notifications.flatMap((notification) => {
      if (!notification.link) return []
      const match = notification.link.match(/\/payments\/confirm\/(\d+)(?:\/|$)/)
      return match ? [Number(match[1])] : []
    })
    if (transactionIds.length === 0) return notifications

    const transactions = await this.transactionRepository.find({
      where: { id: In([...new Set(transactionIds)]) },
      select: { id: true, channel: true, status: true },
    })
    const terminalQrTransactions = new Set(
      transactions
        .filter((transaction) =>
          transaction.channel === PaymentChannel.QR
          && (transaction.status === TransactionStatus.COMPLETED || transaction.status === TransactionStatus.FAILED),
        )
        .map((transaction) => transaction.id),
    )

    return notifications.map((notification) => {
      if (!notification.link) return notification
      const match = notification.link.match(/\/payments\/confirm\/(\d+)(?:\/|$)/)
      if (!match || !terminalQrTransactions.has(Number(match[1]))) return notification
      return { ...notification, link: null }
    })
  }

  async markAsRead(userId: number, notificationId: number) {
    await this.repository.update(
      { id: notificationId, userId },
      { isRead: true }
    )
    return this.findByUserId(userId)
  }

  async markAllAsRead(userId: number) {
    await this.repository.update(
      { userId, isRead: false },
      { isRead: true }
    )
    return this.findByUserId(userId)
  }
}