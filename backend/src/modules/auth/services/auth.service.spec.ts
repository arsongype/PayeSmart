import { describe, expect, it } from 'vitest'
import { Role } from '../enums/role.enum.js'
import { normalizeRegistrationRole } from './auth.service.js'

describe('registration role normalization', () => {
  it('does not allow public registration to create an admin', () => {
    expect(normalizeRegistrationRole(Role.ADMIN)).toBe(Role.USER)
  })

  it('preserves the merchant registration role', () => {
    expect(normalizeRegistrationRole(Role.MERCHANT)).toBe(Role.MERCHANT)
  })
})