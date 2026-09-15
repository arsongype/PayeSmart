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
}