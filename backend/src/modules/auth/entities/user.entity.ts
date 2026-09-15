import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import type { RefreshToken } from './refresh-token.entity.js';
import type { Profile } from './profile.entity.js';
import type { Wallet } from './wallet.entity.js';
import type { KycDocument } from './kyc-document.entity.js';
import type { KybDocument } from './kyb-document.entity.js';
import { Role } from '../enums/role.enum.js';
import { KycStatus } from '../enums/kyc-status.enum.js';
import { KybStatus } from '../enums/kyb-status.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true, name: 'first_name' })
  firstName: string;

  @Column({ nullable: true, name: 'last_name' })
  lastName: string;

  @Column({ unique: true, nullable: true })
  cin: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.NON_VERIFIE,
    name: 'kyc_status',
  })
  kycStatus: KycStatus;

  @Column({
    type: 'enum',
    enum: KybStatus,
    default: KybStatus.NON_VERIFIE,
    name: 'kyb_status',
  })
  kybStatus: KybStatus;

  @Column({ default: false, name: 'is_email_verified' })
  isEmailVerified: boolean;

  @Column({ default: false, name: 'is_two_factor_enabled' })
  isTwoFactorEnabled: boolean;

  @Column({ nullable: true, name: 'two_factor_secret' })
  twoFactorSecret: string;

  @OneToMany('RefreshToken', (token: RefreshToken) => token.user)
  refreshTokens: RefreshToken[];

  @OneToOne('Profile', (profile: Profile) => profile.user)
  profile: Profile;

  @OneToOne('Wallet', (wallet: Wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany('KycDocument', (doc: KycDocument) => doc.user)
  kycDocuments: KycDocument[];

  @OneToMany('KybDocument', (doc: KybDocument) => doc.user)
  kybDocuments: KybDocument[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
