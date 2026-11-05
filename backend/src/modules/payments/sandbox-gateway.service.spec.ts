import { BadRequestException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { PaymentChannel } from '../auth/enums/payment-channel.enum.js'
import { SandboxGatewayService } from './sandbox-gateway.service.js'

describe('sandbox payment gateway', () => {
  const gateway = new SandboxGatewayService()

  it('only authorizes sandbox card tokens', async () => {
    await expect(gateway.authorize({
      id: 1,
      channel: PaymentChannel.CARD,
      metadata: { cardToken: 'real-card-token' },
    } as never)).rejects.toBeInstanceOf(BadRequestException)

    await expect(gateway.authorize({
      id: 2,
      channel: PaymentChannel.CARD,
      metadata: { cardToken: 'tok_test_simulated' },
    } as never)).resolves.toMatchObject({ providerReference: expect.stringMatching(/^SANDBOX-CARD-2-/) })
  })

  it('returns a sandbox reference for QR and bank-transfer simulations', async () => {
    await expect(gateway.authorize({
      id: 3,
      channel: PaymentChannel.QR,
      metadata: {},
    } as never)).resolves.toMatchObject({ providerReference: expect.stringMatching(/^SANDBOX-QR-3-/) })

    await expect(gateway.authorize({
      id: 4,
      channel: PaymentChannel.BANK_TRANSFER,
      metadata: {},
    } as never)).resolves.toMatchObject({ providerReference: expect.stringMatching(/^SANDBOX-BANK_TRANSFER-4-/) })
  })
})
