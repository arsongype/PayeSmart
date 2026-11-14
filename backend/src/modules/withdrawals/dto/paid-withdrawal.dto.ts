import { IsOptional, IsString, MaxLength } from 'class-validator'

export class PaidWithdrawalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
