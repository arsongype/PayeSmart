import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import type { User } from './user.entity.js'

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @ManyToOne('User', (user: User) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'varchar', length: 50, name: 'method_type' })
  methodType: string

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'last_four_digits' })
  lastFourDigits: string | null

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'brand' })
  brand: string | null

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'expiry_date' })
  expiryDate: string | null

  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, unknown> | null

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
