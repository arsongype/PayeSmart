import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { WithdrawalMethod } from './withdrawal-method.enum.js'
import { WithdrawalStatus } from './withdrawal-status.enum.js'

@Entity('withdrawal_requests')
@Index('idx_withdrawal_requests_user_created', ['userId', 'createdAt'])
@Index('idx_withdrawal_requests_status_created', ['status', 'createdAt'])
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @Column({ name: 'wallet_id' })
  walletId: number

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number

  @Column({ type: 'varchar', length: 3 })
  currency: string

  @Column({ type: 'varchar', length: 2, name: 'country_code' })
  countryCode: string

  @Column({ type: 'enum', enum: WithdrawalMethod, enumName: 'withdrawal_method_enum' })
  method: WithdrawalMethod

  @Column({ type: 'text', name: 'destination_ciphertext' })
  destinationCiphertext: string

  @Column({ type: 'enum', enum: WithdrawalStatus, enumName: 'withdrawal_status_enum', default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote: string | null

  @Column({ type: 'integer', nullable: true, name: 'reviewed_by' })
  reviewedBy: number | null

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null

  @Column({ type: 'integer', nullable: true, name: 'paid_by' })
  paidBy: number | null

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
