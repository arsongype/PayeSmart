import { IsNumber, Min } from 'class-validator'

export class QuotePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number
}
