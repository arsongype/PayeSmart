import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MailService } from './services/mail.service.js'
import { Notification } from './entities/notification.entity.js'
import { NotificationService } from './services/notification.service.js'
import { NotificationsController } from './controllers/notifications.controller.js'

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [MailService, NotificationService],
  exports: [MailService, NotificationService],
})
export class NotificationsModule {}
