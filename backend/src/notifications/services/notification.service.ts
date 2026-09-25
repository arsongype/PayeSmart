import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification } from '../entities/notification.entity.js'

@Injectable()
export class NotificationService {
  constructor(@InjectRepository(Notification) private repository: Repository<Notification>) {}

  create(userId: number, title: string, message: string, link?: string) {
    return this.repository.save(this.repository.create({ userId, title, message, link: link ?? null }))
  }

  findByUserId(userId: number) {
    return this.repository.find({ where: { userId }, order: { createdAt: 'DESC' } })
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