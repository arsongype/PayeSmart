import { ConfigService } from '@nestjs/config'
import { describe, expect, it } from 'vitest'
import { CryptoService } from './crypto.service.js'

const service = new CryptoService({ get: () => 'sprint-5-test-key' } as ConfigService)

describe('CryptoService', () => {
  it('encrypts and decrypts sensitive values', () => {
    const encrypted = service.encrypt('tok_test_sensitive')

    expect(encrypted).not.toContain('tok_test_sensitive')
    expect(service.decrypt(encrypted)).toBe('tok_test_sensitive')
  })

  it('uses a unique IV for each encryption', () => {
    expect(service.encrypt('same-value')).not.toBe(service.encrypt('same-value'))
  })

  it('rejects tampered ciphertext', () => {
    const encrypted = service.encrypt('protected')
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('a') ? 'b' : 'a'}`

    expect(() => service.decrypt(tampered)).toThrow()
  })
})