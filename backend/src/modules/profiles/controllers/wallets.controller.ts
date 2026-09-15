import { Controller, Post, Body, Get, Patch, Delete, UseGuards, Param } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { WalletsService } from '../services/wallets.service.js'
import { CreateWalletDto, UpdateWalletDto } from '../../auth/dto/wallet.dto.js'

@Controller('wallets')
@UseGuards(AuthGuard('jwt'))
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Post()
  create(@Body() dto: CreateWalletDto, @Param('userId') userId: number) {
    return this.walletsService.create(userId, dto)
  }

  @Get(':userId')
  findByUserId(@Param('userId') userId: number) {
    return this.walletsService.findByUserId(userId)
  }

  @Patch(':userId')
  update(@Param('userId') userId: number, @Body() dto: UpdateWalletDto) {
    return this.walletsService.update(userId, dto)
  }

  @Post(':userId/outgoing')
  authorizeOutgoing(@Param('userId') userId: string, @Body() body: { amount: number }) {
    return this.walletsService.updateBalance(parseInt(userId, 10), -Math.abs(body.amount))
  }

  @Delete(':userId')
  delete(@Param('userId') userId: number) {
    return this.walletsService.delete(userId)
  }
}
