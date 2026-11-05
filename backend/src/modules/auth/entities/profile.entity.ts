import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity.js'

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id', unique: true })
  userId: number

  @OneToOne('User', (user: User) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'varchar', nullable: true })
  address: string | null

  @Column({ type: 'varchar', nullable: true })
  city: string | null

  @Column({ type: 'varchar', nullable: true })
  country: string | null

  @Column({ type: 'varchar', nullable: true, name: 'postal_code' })
  postalCode: string | null

  @Column({ type: 'varchar', nullable: true, name: 'id_number' })
  idNumber: string | null

  @Column({ type: 'varchar', nullable: true, name: 'id_type' })
  idType: string | null

  @Column({ nullable: true, name: 'id_expiry_date', type: 'date' })
  idExpiryDate: string | null

  @Column({ type: 'varchar', nullable: true, name: 'company_name' })
  companyName: string | null

  @Column({ type: 'varchar', nullable: true, name: 'siren_nif' })
  sirenNif: string | null

  @Column({ type: 'varchar', nullable: true, name: 'trade_register' })
  tradeRegister: string | null

  @Column({ type: 'varchar', nullable: true, name: 'company_address' })
  companyAddress: string | null

  @Column({ type: 'varchar', nullable: true, name: 'company_rib' })
  companyRib: string | null

  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date
}
