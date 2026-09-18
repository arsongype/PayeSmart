import { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { translations, type Language } from '../utils/i18n'

type TranslationKey = keyof typeof translations.fr.common

export function useTranslation() {
  const { settings } = useSettings()
  const locale = settings.language

  const t = useMemo(() => {
    const map = translations[locale] ?? translations.fr
    return (key: TranslationKey) => map.common[key] ?? key
  }, [locale])

  const formatMoney = (amount: number, currency?: string) => {
    const selectedCurrency = currency ?? settings.currency
    try {
      return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
        style: 'currency',
        currency: selectedCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${amount.toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR')} ${selectedCurrency}`
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR').format(value)
  }

  return { t, locale, formatMoney, formatDate, formatNumber }
}
