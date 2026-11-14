import { IsEnum, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'
import { WithdrawalMethod } from '../withdrawal-method.enum.js'

export class CreateWithdrawalDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999999.99)
  amount: number

  @IsEnum(WithdrawalMethod)
  method: WithdrawalMethod

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName: string

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9+()./ -]+$/, { message: 'Coordonnées bancaires invalides' })
  destinationAccount: string

  @ValidateIf((dto: CreateWithdrawalDto) => dto.method === WithdrawalMethod.BANK_TRANSFER)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bankName?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
