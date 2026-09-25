import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import type { User } from './user.entity.js'

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'token_hash' })
  tokenHash: string

  @Column({ name: 'user_id' })
  userId: number

  @ManyToOne('User', (user: User) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date

  @Column({ default: false, name: 'is_used' })
  isUsed: boolean

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
