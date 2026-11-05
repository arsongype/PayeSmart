import { createContext, useContext } from 'react'

export type Language = 'fr' | 'en'
export type Currency = 'EUR' | 'USD' | 'XOF' | 'MGA'

export interface Settings {
  language: Language
  currency: Currency
  emailNotifications: boolean
  fraudAlerts: boolean
}

interface SettingsContextValue {
  settings: Settings
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  save: () => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
