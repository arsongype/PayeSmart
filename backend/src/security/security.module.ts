import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog } from './entities/audit-log.entity.js'
import { AuditService } from './services/audit.service.js'
import { CryptoService } from './services/crypto.service.js'
import { AuditInterceptor } from './interceptors/audit.interceptor.js'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, CryptoService, AuditInterceptor],
  exports: [AuditService, CryptoService, AuditInterceptor],
})
export class SecurityModule {}