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

@Entity('otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id', nullable: true })
  userId: number | null

  @ManyToOne('User', (user: User) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: number | null

  @ManyToOne('Transaction', (transaction: Transaction) => transaction.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction

  @Column({ name: 'code_hash' })
  codeHash: string

  @Column({ type: 'varchar', length: 50, name: 'purpose' })
  purpose: string

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date

  @Column({ default: false, name: 'is_used' })
  isUsed: boolean

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt: Date | null

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
