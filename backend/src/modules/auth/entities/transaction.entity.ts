import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Wallet } from './wallet.entity.js'
import { TransactionStatus } from '../enums/transaction-status.enum.js'
import { PaymentChannel } from '../enums/payment-channel.enum.js'

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'sender_wallet_id' })
  senderWalletId: number

  @ManyToOne('Wallet')
  @JoinColumn({ name: 'sender_wallet_id' })
  senderWallet: Wallet

  @Column({ name: 'recipient_wallet_id' })
  recipientWalletId: number

  @ManyToOne('Wallet')
  @JoinColumn({ name: 'recipient_wallet_id' })
  recipientWallet: Wallet

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string

  @Column({ type: 'enum', enum: PaymentChannel })
  channel: PaymentChannel

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'external_reference' })
  externalReference: string | null

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string | null

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'risk_score' })
  riskScore: number | null

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'risk_level' })
  riskLevel: string | null

  @Column({ type: 'varchar', length: 120, unique: true, nullable: true, name: 'idempotency_key' })
  idempotencyKey: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
