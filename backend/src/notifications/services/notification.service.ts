import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification } from '../entities/notification.entity.js'

@Injectable()
export class NotificationService {
  constructor(@InjectRepository(Notification) private repository: Repository<Notification>) {}

  create(userId: number, title: string, message: string) {
    return this.repository.save(this.repository.create({ userId, title, message }))
  }

  findByUserId(userId: number) {
    return this.repository.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.repository.findOne({ where: { id: notificationId, userId } })
    if (!notification) return null
    notification.isRead = true
    return this.repository.save(notification)
  }
}