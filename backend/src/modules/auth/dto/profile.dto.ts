import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsObject, Matches } from 'class-validator'

export class CreateProfileDto {
  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  city?: string

  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'Le pays doit être indiqué avec son code ISO-2 (ex. MG)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
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
