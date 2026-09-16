import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Wallet } from './wallet.entity.js'
import { Transaction } from './transaction.entity.js'

@Entity('ledgers')
export class Ledger {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'transaction_id' })
  transactionId: number

  @ManyToOne('Transaction')
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction

  @Column({ name: 'wallet_id' })
  walletId: number

  @ManyToOne('Wallet')
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string

  @Column({ type: 'varchar', length: 10 })
  direction: 'DEBIT' | 'CREDIT'

  @Column({ type: 'varchar', length: 120, unique: true, name: 'entry_reference' })
  entryReference: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
