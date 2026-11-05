import { describe, expect, it } from 'vitest'
import { evaluateRiskDecision, isMonitoredCountry, PAYMENT_TWO_FACTOR_TTL_MS } from './payments.service.js'
import { getCurrencyForCountry } from '../auth/services/wallet-defaults.js'

describe('payments fraud risk evaluation', () => {
  it('approves low risk transactions', () => {
    expect(evaluateRiskDecision(20)).toBe('APPROVE')
  })

  it('requires 2FA for medium risk transactions', () => {
    expect(evaluateRiskDecision(55)).toBe('REQUIRE_2FA')
  })

  it('blocks high risk transactions', () => {
    expect(evaluateRiskDecision(85)).toBe('BLOCK')
  })

  it('uses the configured boundaries consistently', () => {
    expect(evaluateRiskDecision(29.99, 30, 70)).toBe('APPROVE')
    expect(evaluateRiskDecision(30, 30, 70)).toBe('REQUIRE_2FA')
    expect(evaluateRiskDecision(69.99, 30, 70)).toBe('REQUIRE_2FA')
    expect(evaluateRiskDecision(70, 30, 70)).toBe('BLOCK')
  })

  it('uses backend defaults matching the AI service', () => {
    expect(evaluateRiskDecision(29.99)).toBe('APPROVE')
    expect(evaluateRiskDecision(30)).toBe('REQUIRE_2FA')
    expect(evaluateRiskDecision(69.99)).toBe('REQUIRE_2FA')
    expect(evaluateRiskDecision(70)).toBe('BLOCK')
  })

  it('expires payment confirmation codes after thirty minutes', () => {
    expect(PAYMENT_TWO_FACTOR_TTL_MS).toBe(1_800_000)
  })

  it('matches ISO country codes against profile codes and localized country names', () => {
    expect(isMonitoredCountry('MG', ['MG'])).toBe(true)
    expect(isMonitoredCountry('Madagascar', ['MG'])).toBe(true)
    expect(isMonitoredCountry('États-Unis', ['US'])).toBe(true)
    expect(isMonitoredCountry('France', ['US'])).toBe(false)
  })

  it('keeps wallet currency selection correct when profiles use ISO-2 codes', () => {
    expect(getCurrencyForCountry('MG')).toBe('MGA')
    expect(getCurrencyForCountry('FR')).toBe('EUR')
    expect(getCurrencyForCountry('US')).toBe('USD')
  })
})
