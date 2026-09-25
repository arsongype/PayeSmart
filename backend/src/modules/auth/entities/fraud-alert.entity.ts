import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Transaction } from './transaction.entity.js'
import { User } from './user.entity.js'

@Entity('fraud_alerts')
export class FraudAlert {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'transaction_id', unique: true })
  transactionId: number

  @ManyToOne('Transaction', (transaction: Transaction) => transaction.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction

  @Column({ name: 'user_id' })
  userId: number

  @ManyToOne('User', (user: User) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'varchar', length: 20, name: 'risk_level' })
  riskLevel: string

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'risk_score' })
  riskScore: number

  @Column({ type: 'text', nullable: true, name: 'reasons' })
  reasons: string | null

  @Column({ type: 'varchar', length: 50, default: 'OPEN', name: 'status' })
  status: string

  @Column({ type: 'text', nullable: true, name: 'admin_notes' })
  adminNotes: string | null

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null

  @Column({ type: 'integer', name: 'reviewed_by', nullable: true })
  reviewedBy: number | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
