import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator'
import { WalletStatus } from '../enums/wallet-status.enum.js'

export class CreateWalletDto {
  @IsString()
  walletNumber: string

  @IsNumber()
  @IsOptional()
  balance?: number

  @IsNumber()
  @IsOptional()
  dailyLimit?: number

  @IsNumber()
  @IsOptional()
  monthlyLimit?: number

  @IsEnum(WalletStatus)
  @IsOptional()
  status?: WalletStatus

  @IsString()
  @IsOptional()
  currency?: string
}

export class UpdateWalletDto {
  @IsNumber()
  @IsOptional()
  balance?: number

  @IsNumber()
  @IsOptional()
  dailyLimit?: number

  @IsNumber()
  @IsOptional()
  monthlyLimit?: number

  @IsEnum(WalletStatus)
  @IsOptional()
  status?: WalletStatus
}
