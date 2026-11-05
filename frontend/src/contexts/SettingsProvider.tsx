import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { SettingsContext, type Settings } from './SettingsContext'

const defaultSettings: Settings = { language: 'fr', currency: 'EUR', emailNotifications: true, fraudAlerts: true }

interface SettingsProviderProps {
  children: ReactNode
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
