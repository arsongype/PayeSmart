import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import type { User } from './user.entity.js'

@Entity('device_fingerprints')
@Index(['userId', 'fingerprintHash'])
export class DeviceFingerprint {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @ManyToOne('User', (user: User) => user.deviceFingerprints)
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'fingerprint_hash' })
  fingerprintHash: string

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'device_name' })
  deviceName: string | null

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'browser' })
  browser: string | null

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'os' })
  os: string | null

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress: string | null

  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, unknown> | null

  @Column({ default: true, name: 'is_trusted' })
  isTrusted: boolean

  @Column({ type: 'timestamp', nullable: true, name: 'last_seen_at' })
  lastSeenAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
