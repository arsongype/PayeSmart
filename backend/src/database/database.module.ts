import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MigrationService } from './services/migration.service.js'
import { MigrationController } from './controllers/migration.controller.js'

@Module({
  imports: [ConfigModule, TypeOrmModule],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class DatabaseModule {}
