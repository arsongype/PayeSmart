import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('login_attempts')
@Index(['email', 'createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'email' })
  email: string

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null

  @Column({ name: 'attempts', default: 1 })
  attempts: number

  @Column({ default: false, name: 'is_locked' })
  isLocked: boolean

  @Column({ type: 'timestamp', nullable: true, name: 'locked_until' })
  lockedUntil: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @CreateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
