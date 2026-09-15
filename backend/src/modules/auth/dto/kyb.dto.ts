import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator'
import { DocumentType } from '../enums/document-type.enum.js'
import { KybStatus } from '../enums/kyb-status.enum.js'

export class CreateKybDocumentDto {
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
  aiRiskScore?: number

  @IsString()
  @IsOptional()
  companyName?: string

  @IsString()
  @IsOptional()
  sirenNif?: string
}

export class ReviewKybDocumentDto {
  @IsEnum(KybStatus)
  status: KybStatus

  @IsString()
  @IsOptional()
  rejectionReason?: string
}
