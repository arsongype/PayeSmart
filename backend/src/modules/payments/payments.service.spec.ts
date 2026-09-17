import { describe, expect, it } from 'vitest'
import { evaluateRiskDecision } from './payments.service.js'

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
})
