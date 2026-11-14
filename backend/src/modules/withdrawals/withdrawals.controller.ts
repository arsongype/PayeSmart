import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js'
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto.js'
import { PaidWithdrawalDto } from './dto/paid-withdrawal.dto.js'
import { WithdrawalsService, type AdminWithdrawalResponse } from './withdrawals.service.js'
import { RolesGuard } from '../../common/guards/roles.guard.js'
import { Roles } from '../auth/controllers/auth.controller.js'
import { Role } from '../auth/enums/role.enum.js'

interface RequestWithUser extends Request {
  user: { sub: string }
}

@Controller('withdrawals')
@UseGuards(AuthGuard('jwt'))
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get('options')
  getOptions(@Req() req: RequestWithUser) {
    return this.withdrawalsService.getOptions(Number(req.user.sub))
  }

  @Get()
  findMine(@Req() req: RequestWithUser) {
    return this.withdrawalsService.findMine(Number(req.user.sub))
  }

  @Post()
  create(@Body() dto: CreateWithdrawalDto, @Req() req: RequestWithUser) {
    return this.withdrawalsService.create(Number(req.user.sub), dto)
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.withdrawalsService.cancel(Number(req.user.sub), id)
  }
}

@Controller('admin/withdrawals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminWithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get()
  findAll(): Promise<AdminWithdrawalResponse[]> {
    return this.withdrawalsService.findAllForAdmin()
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.withdrawalsService.approve(id, Number(req.user.sub))
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectWithdrawalDto, @Req() req: RequestWithUser) {
    return this.withdrawalsService.reject(id, Number(req.user.sub), dto.note)
  }

  @Patch(':id/paid')
  markPaid(@Param('id', ParseIntPipe) id: number, @Body() dto: PaidWithdrawalDto, @Req() req: RequestWithUser) {
    return this.withdrawalsService.markPaid(id, Number(req.user.sub), dto.note)
  }
}
