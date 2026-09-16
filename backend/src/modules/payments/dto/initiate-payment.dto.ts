import { IsEnum, IsNumber, IsNumberString, IsOptional, IsString, Min } from 'class-validator'
import { PaymentChannel } from '../../auth/enums/payment-channel.enum.js'

export class InitiatePaymentDto {
  @IsNumberString()
  @IsOptional()
  recipientWalletNumber: string

  @IsNumber()
  @Min(0.01)
  amount: number

  @IsEnum(PaymentChannel)
  channel: PaymentChannel

  @IsString()
  @IsOptional()
  currency?: string

  @IsString()
  @IsOptional()
  cardToken?: string

  @IsString()
  @IsOptional()
  phoneNumber?: string

  @IsString()
  @IsOptional()
  bankReference?: string
}
