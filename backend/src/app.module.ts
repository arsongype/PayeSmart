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
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
          url: process.env.AI_SERVICE_URL ?? 'http://localhost:8001',
          apiKey: process.env.AI_API_KEY ?? 'dev-secret-key-change-in-production',
        },
        redis: {
          url: process.env.REDIS_URL,
        },
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
            'http://localhost:5173',
            'http://localhost:5174',
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
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
  ],
  controllers: [],
  providers: [HttpExceptionFilter, LoggingInterceptor],
})
export class AppModule {}
