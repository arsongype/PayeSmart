import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null

  @Column({ length: 16 })
  method: string

  @Column({ length: 255 })
  path: string

  @Column({ type: 'varchar', length: 120, nullable: true })
  action: string | null

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null

  @Column({ name: 'status_code', default: 200 })
  statusCode: number

  @Column({ name: 'response_time_ms', default: 0 })
  responseTimeMs: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}