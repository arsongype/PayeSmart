import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { Transaction } from '../auth/entities/transaction.entity.js'
import Stripe from 'stripe'

@Injectable()
export class SandboxGatewayService {
  constructor(private readonly configService?: ConfigService) {}

  async createPaymentIntent(input: { amount: number; currency: string }) {
    const stripe = this.getStripeClient()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: this.toMinorUnits(input.amount, input.currency),
      currency: input.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      capture_method: 'manual',
    })
    if (!paymentIntent.client_secret) {
      throw new ServiceUnavailableException('Stripe n’a pas fourni de clé de confirmation')
    }
    const publishableKey = this.configService?.get<string>('stripe.publishableKey')
    if (!publishableKey) {
      throw new ServiceUnavailableException('Le paiement par carte n’est pas configuré')
    }
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey,
    }
  }

  async verifyPaymentIntent(paymentIntentId: string, amount: number, currency: string) {
    const paymentIntent = await this.getStripeClient().paymentIntents.retrieve(paymentIntentId)
    if (
      paymentIntent.status !== 'requires_capture'
      || paymentIntent.amount !== this.toMinorUnits(amount, currency)
      || paymentIntent.currency !== currency.toLowerCase()
    ) {
      throw new BadRequestException('Le paiement Stripe n’est pas confirmé ou son montant est invalide')
    }
  }

  async authorize(transaction: Transaction): Promise<{ providerReference: string }> {
    const metadata = transaction.metadata ?? {}
    if (transaction.channel === PaymentChannel.CARD && typeof metadata.cardPaymentIntentId === 'string') {
      const paymentIntent = await this.getStripeClient().paymentIntents.capture(metadata.cardPaymentIntentId)
      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException('Le paiement Stripe n’a pas pu être capturé')
      }
      return { providerReference: paymentIntent.id }
    }
    if (
      transaction.channel === PaymentChannel.CARD
      && (typeof metadata.cardToken !== 'string' || !metadata.cardToken.startsWith('tok_test_'))
    ) {
      throw new BadRequestException('Un token de carte de test sandbox est requis')
    }
    return { providerReference: `SANDBOX-${transaction.channel}-${transaction.id}-${Date.now()}` }
  }

  private getStripeClient() {
    const secretKey = this.configService?.get<string>('stripe.secretKey')
    if (!secretKey) throw new ServiceUnavailableException('Le paiement par carte n’est pas configuré')
    return new Stripe(secretKey)
  }

  private toMinorUnits(amount: number, currency: string) {
    const zeroDecimalCurrencies = new Set(['jpy', 'krw', 'xof', 'xaf'])
    return Math.round(amount * (zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100))
  }
}
