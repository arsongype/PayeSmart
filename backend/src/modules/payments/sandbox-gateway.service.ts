import { BadRequestException, Injectable } from '@nestjs/common'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { Transaction } from '../auth/entities/transaction.entity.js'

@Injectable()
export class SandboxGatewayService {
  async authorize(transaction: Transaction): Promise<{ providerReference: string }> {
    const metadata = transaction.metadata ?? {}
    if (transaction.channel === PaymentChannel.CARD && !metadata.cardToken) {
      throw new BadRequestException('Token de carte sandbox manquant')
    }
    if ([PaymentChannel.MVOLA, PaymentChannel.ORANGE_MONEY, PaymentChannel.AIRTEL_MONEY].includes(transaction.channel) && !metadata.phoneNumber) {
      throw new BadRequestException('Numéro Mobile Money manquant')
    }
    return { providerReference: `SANDBOX-${transaction.channel}-${transaction.id}-${Date.now()}` }
  }
}
