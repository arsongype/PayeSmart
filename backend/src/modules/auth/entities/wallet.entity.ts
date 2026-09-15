import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from './user.entity.js'
import { WalletStatus } from '../enums/wallet-status.enum.js'

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id', unique: true })
  userId: number

  @ManyToOne('User', (user: User) => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ unique: true, name: 'wallet_number' })
  walletNumber: string

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'balance' })
  balance: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'daily_limit' })
  dailyLimit: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'monthly_limit' })
  monthlyLimit: number

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus

  @Column({ nullable: true, name: 'currency' })
  currency: string

  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
