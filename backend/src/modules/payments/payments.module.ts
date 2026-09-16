import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaymentsController } from './payments.controller.js'
import { PaymentsService } from './payments.service.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { Transaction } from '../auth/entities/transaction.entity.js'
import { Ledger } from '../auth/entities/ledger.entity.js'
import { NotificationsModule } from '../../notifications/notifications.module.js'
import { SandboxGatewayService } from './sandbox-gateway.service.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Wallet, Transaction, Ledger]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, SandboxGatewayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
