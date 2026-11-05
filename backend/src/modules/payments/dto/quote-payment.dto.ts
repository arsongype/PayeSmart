import { IsIn, IsNumber, IsOptional, Min } from 'class-validator'
import { PAYMENT_CURRENCIES } from '../payment-currency.js'

export class QuotePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number

  @IsOptional()
  @IsIn(PAYMENT_CURRENCIES)
  currency?: string
}
