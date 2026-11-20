import { BadRequestException, Injectable } from '@nestjs/common'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { Transaction } from '../auth/entities/transaction.entity.js'

@Injectable()
export class SandboxGatewayService {
  async authorize(transaction: Transaction): Promise<{ providerReference: string }> {
    const metadata = transaction.metadata ?? {}
    if (
      transaction.channel === PaymentChannel.CARD
      && (typeof metadata.cardToken !== 'string' || !metadata.cardToken.startsWith('tok_test_'))
    ) {
      throw new BadRequestException('Un token de carte de test sandbox est requis')
    }
    return { providerReference: `SANDBOX-${transaction.channel}-${transaction.id}-${Date.now()}` }
  }
}
