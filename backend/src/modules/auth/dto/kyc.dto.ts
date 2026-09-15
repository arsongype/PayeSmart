import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator'
import { DocumentType } from '../enums/document-type.enum.js'
import { KycStatus } from '../enums/kyc-status.enum.js'

export class CreateKycDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType

  @IsString()
  @IsOptional()
  documentUrl: string

  @IsString()
  @IsOptional()
  documentHash?: string

  @IsString()
  @IsOptional()
  ocrData?: string

  @IsNumber()
  @IsOptional()
  aiTrustScore?: number
}

export class ReviewKycDocumentDto {
  @IsEnum(KycStatus)
  status: KycStatus

  @IsString()
  @IsOptional()
  rejectionReason?: string
}
