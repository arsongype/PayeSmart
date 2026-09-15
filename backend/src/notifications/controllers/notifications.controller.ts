import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { NotificationService } from '../services/notification.service.js'

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private service: NotificationService) {}

  @Get()
  getMine(@Req() request: { user: { sub: string } }) {
    return this.service.findByUserId(parseInt(request.user.sub, 10))
  }
}