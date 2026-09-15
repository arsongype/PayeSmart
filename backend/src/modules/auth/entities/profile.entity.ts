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

  @Column({ nullable: true })
  address: string

  @Column({ nullable: true })
  city: string

  @Column({ nullable: true })
  country: string

  @Column({ nullable: true })
  postalCode: string

  @Column({ nullable: true, name: 'id_number' })
  idNumber: string

  @Column({ nullable: true, name: 'id_type' })
  idType: string

  @Column({ nullable: true, name: 'id_expiry_date', type: 'date' })
  idExpiryDate: string

  @Column({ nullable: true, name: 'company_name' })
  companyName: string

  @Column({ nullable: true, name: 'siren_nif' })
  sirenNif: string

  @Column({ nullable: true, name: 'trade_register' })
  tradeRegister: string

  @Column({ nullable: true, name: 'company_address' })
  companyAddress: string

  @Column({ nullable: true, name: 'company_rib' })
  companyRib: string

  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any>

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt: Date

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date
}
