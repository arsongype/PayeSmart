import { Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common'
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

  @Patch('read-all')
  markAllAsRead(@Req() request: { user: { sub: string } }) {
    return this.service.markAllAsRead(parseInt(request.user.sub, 10))
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() request: { user: { sub: string } }) {
    return this.service.markAsRead(parseInt(request.user.sub, 10), id)
  }
}