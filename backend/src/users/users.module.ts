import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { UsersService } from './services/users.service.js'
import { AccountManagementService } from './services/account-management.service.js'
import { UsersController } from './controllers/users.controller.js'
import { User } from '../modules/auth/entities/user.entity.js'
import { KycDocument } from '../modules/auth/entities/kyc-document.entity.js'
import { KybDocument } from '../modules/auth/entities/kyb-document.entity.js'
import { AuthModule } from '../modules/auth/auth.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KycDocument, KybDocument]),
    ConfigModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AccountManagementService],
  exports: [UsersService, AccountManagementService, AuthModule],
})
export class UsersModule {}
