const MGA_PER_UNIT: Record<string, number> = {
  MGA: 1,
  XOF: 8,
  USD: 4600,
  EUR: 5000,
}

export const PAYMENT_CURRENCIES = Object.keys(MGA_PER_UNIT)

export function convertPaymentCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = MGA_PER_UNIT[fromCurrency]
  const toRate = MGA_PER_UNIT[toCurrency]
  if (!fromRate || !toRate) throw new Error('Devise non prise en charge par le sandbox')
  return Math.round((amount * fromRate / toRate) * 100) / 100
}

export function normalizeFraudRiskAmount(amount: number, currency: string): number {
  return convertPaymentCurrency(amount, currency, 'EUR')
}
