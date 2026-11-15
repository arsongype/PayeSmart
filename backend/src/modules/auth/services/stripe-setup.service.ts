import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import Stripe from 'stripe'

export interface VerifiedSignupCard {
  paymentMethodId: string
  lastFourDigits: string
  expiryDate: string
}

@Injectable()
export class StripeSetupService {
  constructor(private readonly configService: ConfigService) {}

  async createSignupSetupIntent(email: string) {
    const stripe = this.getStripeClient()
    const publishableKey = this.configService.get<string>('stripe.publishableKey')
    if (!publishableKey) {
      throw new ServiceUnavailableException('Le paiement par carte n’est pas configuré')
    }

    const setupIntent = await stripe.setupIntents.create({
      allowed_payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        flow: 'signup',
        email_hash: this.hashEmail(email),
      },
    })

    if (!setupIntent.client_secret) {
      throw new ServiceUnavailableException('Stripe n’a pas fourni de clé de confirmation')
    }

    return { clientSecret: setupIntent.client_secret, publishableKey }
  }

  async verifySignupSetupIntent(setupIntentId: string, email: string): Promise<VerifiedSignupCard> {
    const stripe = this.getStripeClient()
    let setupIntent: Stripe.SetupIntent

    try {
      setupIntent = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] })
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        throw new BadRequestException('La confirmation de carte est invalide')
      }
      if (error instanceof Stripe.errors.StripeError) {
        throw new ServiceUnavailableException('Le prestataire de paiement est temporairement indisponible')
      }
      throw error
    }

    const metadata = setupIntent.metadata ?? {}
    if (
      setupIntent.status !== 'succeeded'
      || metadata.flow !== 'signup'
      || metadata.email_hash !== this.hashEmail(email)
      || setupIntent.customer
    ) {
      throw new BadRequestException('La confirmation de carte est invalide ou expirée')
    }

    const paymentMethod = typeof setupIntent.payment_method === 'string'
      ? await stripe.paymentMethods.retrieve(setupIntent.payment_method)
      : setupIntent.payment_method

    if (
      !paymentMethod
      || paymentMethod.type !== 'card'
      || paymentMethod.customer
      || !paymentMethod.card
      || paymentMethod.card.brand !== 'visa'
    ) {
      throw new BadRequestException('Veuillez confirmer une carte Visa valide')
    }

    return {
      paymentMethodId: paymentMethod.id,
      lastFourDigits: paymentMethod.card.last4,
      expiryDate: `${String(paymentMethod.card.exp_month).padStart(2, '0')}/${String(paymentMethod.card.exp_year).slice(-2)}`,
    }
  }

  async createCustomerAndAttachCard(card: VerifiedSignupCard, email: string, name: string) {
    const stripe = this.getStripeClient()
    const customer = await stripe.customers.create({ email, name })

    try {
      await stripe.paymentMethods.attach(card.paymentMethodId, { customer: customer.id })
    } catch (error) {
      await stripe.customers.del(customer.id)
      throw error
    }

    return {
      stripeCustomerId: customer.id,
      stripePaymentMethodId: card.paymentMethodId,
    }
  }

  async detachPaymentMethod(paymentMethodId: string) {
    await this.getStripeClient().paymentMethods.detach(paymentMethodId)
  }

  async deleteCustomer(customerId: string) {
    try {
      await this.getStripeClient().customers.del(customerId)
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') return
      throw error
    }
  }

  private getStripeClient() {
    const secretKey = this.configService.get<string>('stripe.secretKey')
    if (!secretKey) {
      throw new ServiceUnavailableException('Le paiement par carte n’est pas configuré')
    }
    return new Stripe(secretKey)
  }

  private hashEmail(email: string) {
    return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  }
}
