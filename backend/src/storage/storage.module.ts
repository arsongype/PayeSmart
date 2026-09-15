import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { storage, fileFilter } from './storage.config.js'

@Module({
  imports: [
    MulterModule.register({
      storage,
      fileFilter,
    }),
  ],
  exports: [MulterModule],
})
export class StorageModule {}
