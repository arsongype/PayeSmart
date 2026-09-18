import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Transaction } from '../auth/entities/transaction.entity.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { ReportingController } from './reporting.controller.js'
import { ReportingService } from './reporting.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User, Wallet])],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}