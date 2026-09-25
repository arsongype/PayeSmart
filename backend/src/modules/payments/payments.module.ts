import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaymentsController } from './payments.controller.js'
import { PaymentsService } from './payments.service.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { Transaction } from '../auth/entities/transaction.entity.js'
import { Ledger } from '../auth/entities/ledger.entity.js'
import { FraudAlert } from '../auth/entities/fraud-alert.entity.js'
import { OtpCode } from '../auth/entities/otp-code.entity.js'
import { NotificationsModule } from '../../notifications/notifications.module.js'
import { SandboxGatewayService } from './sandbox-gateway.service.js'
import { SecurityModule } from '../../security/security.module.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Wallet, Transaction, Ledger, FraudAlert, OtpCode]),
    NotificationsModule,
    SecurityModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, SandboxGatewayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
