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
import { DocumentType } from '../enums/document-type.enum.js'
import { KycStatus } from '../enums/kyc-status.enum.js'

@Entity('kyc_documents')
export class KycDocument {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @ManyToOne('User', (user: User) => user.kycDocuments)
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({
    type: 'enum',
    enum: DocumentType,
    name: 'document_type',
  })
  documentType: DocumentType

  @Column({ name: 'document_url' })
  documentUrl: string

  @Column({ nullable: true, name: 'document_hash' })
  documentHash: string

  @Column({ nullable: true, name: 'ocr_data' })
  ocrData: string

  @Column({ nullable: true, name: 'ai_trust_score' })
  aiTrustScore: number

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.EN_COURS,
  })
  status: KycStatus

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null

  @Column({ nullable: true, name: 'reviewed_by' })
  reviewedBy: number

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date

  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
