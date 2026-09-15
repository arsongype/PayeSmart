import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { ProfilesService } from './services/profiles.service.js'
import { WalletsService } from './services/wallets.service.js'
import { KycService } from './services/kyc.service.js'
import { KybService } from './services/kyb.service.js'
import { AiService } from './services/ai.service.js'
import { ProfilesController } from './controllers/profiles.controller.js'
import { WalletsController } from './controllers/wallets.controller.js'
import { KycController } from './controllers/kyc.controller.js'
import { KybController } from './controllers/kyb.controller.js'
import { AdminController } from './controllers/admin.controller.js'
import { User } from '../auth/entities/user.entity.js'
import { Profile } from '../auth/entities/profile.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'
import { KycDocument } from '../auth/entities/kyc-document.entity.js'
import { KybDocument } from '../auth/entities/kyb-document.entity.js'
import { AuthModule } from '../auth/auth.module.js'
import { UsersModule } from '../../users/users.module.js'
import { StorageModule } from '../../storage/storage.module.js'
import { NotificationsModule } from '../../notifications/notifications.module.js'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Profile, Wallet, KycDocument, KybDocument]),
    AuthModule,
    UsersModule,
    StorageModule,
    NotificationsModule,
  ],
  controllers: [ProfilesController, WalletsController, KycController, KybController, AdminController],
  providers: [ProfilesService, WalletsService, KycService, KybService, AiService],
  exports: [ProfilesService, WalletsService, KycService, KybService, AiService],
})
export class ProfilesModule {}
