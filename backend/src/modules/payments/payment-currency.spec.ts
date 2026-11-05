import { describe, expect, it } from 'vitest'
import { convertPaymentCurrency, PAYMENT_CURRENCIES } from './payment-currency.js'

describe('sandbox payment currencies', () => {
  it('converts between the supported currencies using the disclosed demo rates', () => {
    expect(PAYMENT_CURRENCIES).toEqual(['MGA', 'XOF', 'USD', 'EUR'])
    expect(convertPaymentCurrency(50000, 'MGA', 'EUR')).toBe(10)
    expect(convertPaymentCurrency(10, 'EUR', 'MGA')).toBe(50000)
    expect(convertPaymentCurrency(100, 'USD', 'XOF')).toBe(57500)
  })
})
