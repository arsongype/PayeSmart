import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SecurityModule } from '../../security/security.module.js'
import { Profile } from '../auth/entities/profile.entity.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { AdminWithdrawalsController, WithdrawalsController } from './withdrawals.controller.js'
import { WithdrawalRequest } from './withdrawal-request.entity.js'
import { WithdrawalsService } from './withdrawals.service.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([WithdrawalRequest, Profile, User, Wallet]),
    SecurityModule,
  ],
  controllers: [WithdrawalsController, AdminWithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
