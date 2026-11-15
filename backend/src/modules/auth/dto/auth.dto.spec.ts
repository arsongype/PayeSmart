import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { RegisterDto } from './auth.dto.js'

const validRegistration = {
  email: 'client@example.com',
  password: 'secure-password',
  lastName: 'Client',
}

describe('RegisterDto card setup validation', () => {
  it('allows registration without card details when the user has no Visa', async () => {
    const dto = plainToInstance(RegisterDto, { ...validRegistration, hasVisa: false })

    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it('requires a Stripe SetupIntent when the user says they have a Visa', async () => {
    const dto = plainToInstance(RegisterDto, { ...validRegistration, hasVisa: true })

    const errors = await validate(dto)

    expect(errors.some((error) => error.property === 'stripeSetupIntentId')).toBe(true)
  })
})
