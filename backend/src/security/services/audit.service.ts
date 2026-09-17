import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/audit-log.entity.js'

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private repository: Repository<AuditLog>) {}

  record(entry: Partial<AuditLog>) {
    return this.repository.save(this.repository.create(entry))
  }
}