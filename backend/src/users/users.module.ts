import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { UsersService } from './services/users.service.js'
import { UsersController } from './controllers/users.controller.js'
import { User } from '../modules/auth/entities/user.entity.js'
import { AuthModule } from '../modules/auth/auth.module.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, AuthModule],
})
export class UsersModule {}
