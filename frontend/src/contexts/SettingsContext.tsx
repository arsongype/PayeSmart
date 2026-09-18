import { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'fr' | 'en'
export type Currency = 'EUR' | 'USD' | 'XOF' | 'MGA'

export interface Settings {
  language: Language
  currency: Currency
}

const defaultSettings: Settings = { language: 'fr', currency: 'EUR' }

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

interface SettingsProviderProps {
  children: React.ReactNode
  userId?: string | null
}

export function SettingsProvider({ children, userId }: SettingsProviderProps) {
  const settingsKey = `paysmart-settings-${userId ?? 'guest'}`
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(settingsKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>
        return { ...defaultSettings, ...parsed }
      }
    } catch {
      // ignore
    }
    return defaultSettings
  })

  useEffect(() => {
    document.documentElement.lang = settings.language
  }, [settings.language])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const save = () => {
    localStorage.setItem(settingsKey, JSON.stringify(settings))
  }

  return (
    <SettingsContext.Provider value={{ settings, update, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

