export type SupportedCurrency = 'EUR' | 'USD' | 'XOF' | 'MGA'

export const formatAccountNumber = (accountNumber: string): string =>
  accountNumber.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') ?? ''

export const maskAccountNumber = (accountNumber: string): string => {
  const masked = accountNumber.replace(/\D/g, '').replace(/\d(?=\d{4})/g, '•')
  return masked.match(/.{1,4}/g)?.join(' ') ?? ''
}

const currencySymbols: Record<SupportedCurrency, string> = {
  EUR: '€',
  USD: '$',
  XOF: 'FCFA',
  MGA: 'Ar',
}

export const getCurrencySymbol = (currency: string): string =>
  currency in currencySymbols
    ? currencySymbols[currency as SupportedCurrency]
    : currency

export const formatCurrencySymbol = (amount: number, currency: string, locale = 'fr-FR'): string => {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    const symbol = getCurrencySymbol(currency)
    return formatter.formatToParts(amount)
      .map((part) => part.type === 'currency' ? symbol : part.value)
      .join('')
  } catch {
    return `${amount.toLocaleString(locale)} ${getCurrencySymbol(currency)}`
  }
}

// Approximate rates: one unit of each currency expressed in EUR.
const currencyToEur: Record<SupportedCurrency, number> = {
  EUR: 1,
  USD: 0.92,
  XOF: 1 / 655.957,
  MGA: 1 / 4900,
}

export const convertCurrency = (
  amount: number,
  fromCurrency: string = 'EUR',
  toCurrency: string = 'EUR',
): number => {
  const fromRate = currencyToEur[fromCurrency as SupportedCurrency] ?? currencyToEur.EUR
  const toRate = currencyToEur[toCurrency as SupportedCurrency] ?? currencyToEur.EUR
  return amount * fromRate / toRate
}

export const formatCurrency = (amount: number, currency: string = 'XOF', sourceCurrency = currency): string => {
  return formatCurrencySymbol(convertCurrency(amount, sourceCurrency, currency), currency)
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours} h`
  return `${hours} h ${remainingMinutes} min`
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'à l\'instant'
  if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)} h`
  return `il y a ${Math.floor(diffInSeconds / 86400)} j`
}

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    breaching_sla: 'bg-red-100 text-red-800',
    review: 'bg-orange-100 text-orange-800',
    waiting: 'bg-gray-100 text-gray-800',
    needs_review: 'bg-orange-100 text-orange-800',
    unassigned: 'bg-gray-100 text-gray-800',
    assigned: 'bg-blue-100 text-blue-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export const getRiskColor = (level: string): string => {
  const colors: Record<string, string> = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  }
  return colors[level] || 'text-gray-600 bg-gray-50'
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    completed: 'Complété',
    failed: 'Échoué',
    breaching_sla: 'SLA dépassé',
    review: 'En revue',
    waiting: 'En attente',
    needs_review: 'Nécessite revue',
    unassigned: 'Non assigné',
    assigned: 'Assigné',
  }
  return labels[status] || status
}

export const getRiskLabel = (level: string): string => {
  const labels: Record<string, string> = {
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    critical: 'Critique',
  }
  return labels[level] || level
}

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    client: 'Client',
    merchant: 'Marchand',
    admin: 'Administrateur',
  }
  return labels[role] || role
}
