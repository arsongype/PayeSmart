import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MailService } from './services/mail.service.js'
import { Notification } from './entities/notification.entity.js'
import { NotificationService } from './services/notification.service.js'
import { NotificationsController } from './controllers/notifications.controller.js'
import { Transaction } from '../modules/auth/entities/transaction.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Transaction])],
  controllers: [NotificationsController],
  providers: [MailService, NotificationService],
  exports: [MailService, NotificationService],
})
export class NotificationsModule {}
