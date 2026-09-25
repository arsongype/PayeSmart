import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './modules/auth/auth.module.js'
import { UsersModule } from './users/users.module.js'
import { NotificationsModule } from './notifications/notifications.module.js'
import { DatabaseModule } from './database/database.module.js'
import { ProfilesModule } from './modules/profiles/profiles.module.js'
import { StorageModule } from './storage/storage.module.js'
import { PaymentsModule } from './modules/payments/payments.module.js'
import { ReportingModule } from './modules/reporting/reporting.module.js'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { Notification } from './notifications/entities/notification.entity.js'
import { KybDocument } from './modules/auth/entities/kyb-document.entity.js'
import { Ledger } from './modules/auth/entities/ledger.entity.js'
import { KycDocument } from './modules/auth/entities/kyc-document.entity.js'
import { Profile } from './modules/auth/entities/profile.entity.js'
import { RefreshToken } from './modules/auth/entities/refresh-token.entity.js'
import { Transaction } from './modules/auth/entities/transaction.entity.js'
import { User } from './modules/auth/entities/user.entity.js'
import { Wallet } from './modules/auth/entities/wallet.entity.js'
import { AuditLog } from './security/entities/audit-log.entity.js'
import { PasswordResetToken } from './modules/auth/entities/password-reset-token.entity.js'
import { LoginAttempt } from './modules/auth/entities/login-attempt.entity.js'
import { PaymentMethod } from './modules/auth/entities/payment-method.entity.js'
import { FraudAlert } from './modules/auth/entities/fraud-alert.entity.js'
import { DeviceFingerprint } from './modules/auth/entities/device-fingerprint.entity.js'
import { OtpCode } from './modules/auth/entities/otp-code.entity.js'
import { SecurityRule } from './modules/auth/entities/security-rule.entity.js'
import { SecurityModule } from './security/security.module.js'
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({
        port: parseInt(process.env.PORT ?? '3000', 10),
        database: {
          host: process.env.DB_HOST ?? 'localhost',
          port: parseInt(process.env.DB_PORT ?? '5432', 10),
          username: process.env.DB_USERNAME ?? 'postgres',
          password: process.env.DB_PASSWORD ?? 'arson',
          database: process.env.DB_NAME ?? 'paysmart_db',
        },
        jwt: {
          secret: process.env.JWT_SECRET ?? 'your-secret-key-change-in-production',
          expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
          refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret-key-change-in-production',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        },
        aiService: {
          url: process.env.AI_SERVICE_URL ?? 'http://localhost:8101',
          apiKey: process.env.AI_API_KEY ?? 'dev-secret-key-change-in-production',
        },
        security: {
          encryptionKey: process.env.ENCRYPTION_KEY ?? 'dev-only-change-me',
        },
        redis: {
          url: process.env.REDIS_URL,
        },
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
          ],
          credentials: true,
        },
      })],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [AuditLog, Notification, KybDocument, Ledger, KycDocument, Profile, RefreshToken, Transaction, User, Wallet, PasswordResetToken, LoginAttempt, PaymentMethod, FraudAlert, DeviceFingerprint, OtpCode, SecurityRule],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    NotificationsModule,
    DatabaseModule,
    ProfilesModule,
    StorageModule,
    PaymentsModule,
    ReportingModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService, HttpExceptionFilter, LoggingInterceptor],
})
export class AppModule {}
