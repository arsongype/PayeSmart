import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './controllers/auth.controller.js'
import { AuthService } from './services/auth.service.js'
import { User } from './entities/user.entity.js'
import { RefreshToken } from './entities/refresh-token.entity.js'
import { Profile } from './entities/profile.entity.js'
import { Wallet } from './entities/wallet.entity.js'
import { KycDocument } from './entities/kyc-document.entity.js'
import { KybDocument } from './entities/kyb-document.entity.js'
import { Transaction } from './entities/transaction.entity.js'
import { Ledger } from './entities/ledger.entity.js'
import { PasswordResetToken } from './entities/password-reset-token.entity.js'
import { LoginAttempt } from './entities/login-attempt.entity.js'
import { PaymentMethod } from './entities/payment-method.entity.js'
import { FraudAlert } from './entities/fraud-alert.entity.js'
import { DeviceFingerprint } from './entities/device-fingerprint.entity.js'
import { OtpCode } from './entities/otp-code.entity.js'
import { SecurityRule } from './entities/security-rule.entity.js'
import { JwtStrategy } from './strategies/jwt.strategy.js'
import { JwtAuthGuard } from './guards/jwt-auth.guard.js'
import { NotificationsModule } from '../../notifications/notifications.module.js'
import { SecurityModule } from '../../security/security.module.js'

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    SecurityModule,
    PassportModule,
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      Profile,
      Wallet,
      KycDocument,
      KybDocument,
      Transaction,
      Ledger,
      PasswordResetToken,
      LoginAttempt,
      PaymentMethod,
      FraudAlert,
      DeviceFingerprint,
      OtpCode,
      SecurityRule,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}