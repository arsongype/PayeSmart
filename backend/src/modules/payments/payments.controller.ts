import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { PaymentsService } from './payments.service.js'
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js'
import { ConfirmTwoFactorDto } from './dto/confirm-2fa.dto.js'

interface RequestWithUser extends Request {
  user: { sub: string }
}

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('recipient/:walletNumber')
  findRecipient(@Param('walletNumber') walletNumber: string) {
    return this.paymentsService.findRecipient(walletNumber)
  }

  @Get('recipient-by-phone/:phoneNumber')
  findRecipientByPhone(@Param('phoneNumber') phoneNumber: string) {
    return this.paymentsService.findRecipientByPhone(phoneNumber)
  }

  @Get('virtual-card')
  getVirtualCard(@Req() req: RequestWithUser) {
    return this.paymentsService.getVirtualCard(parseInt(req.user.sub, 10))
  }

  @Post('initiate')
  initiate(@Body() dto: InitiatePaymentDto, @Req() req: RequestWithUser) {
    return this.paymentsService.initiate(parseInt(req.user.sub, 10), dto, {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      deviceFingerprint: req.get('x-device-fingerprint') ?? req.get('user-agent') ?? 'unknown',
    })
  }

  @Get('history')
  history(@Req() req: RequestWithUser) {
    return this.paymentsService.findHistory(parseInt(req.user.sub, 10))
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.paymentsService.findOne(parseInt(req.user.sub, 10), id)
  }

  @Post(':id/process')
  process(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.paymentsService.processForUser(parseInt(req.user.sub, 10), id)
  }

  @Post(':id/confirm-2fa')
  confirmTwoFactor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmTwoFactorDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentsService.confirmTwoFactor(parseInt(req.user.sub, 10), id, dto.code)
  }
}
