import { IsString, IsOptional, IsObject } from 'class-validator'

export class CreateProfileDto {
  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  city?: string

  @IsString()
  @IsOptional()
  country?: string

  @IsString()
  @IsOptional()
  postalCode?: string

  @IsString()
  @IsOptional()
  idNumber?: string

  @IsString()
  @IsOptional()
  idType?: string

  @IsString()
  @IsOptional()
  idExpiryDate?: string

  @IsString()
  @IsOptional()
  companyName?: string

  @IsString()
  @IsOptional()
  sirenNif?: string

  @IsString()
  @IsOptional()
  tradeRegister?: string

  @IsString()
  @IsOptional()
  companyAddress?: string

  @IsString()
  @IsOptional()
  companyRib?: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}
