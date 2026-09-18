import { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'

export function useLocale() {
  const { settings } = useSettings()
  return useMemo(() => settings.language === 'en' ? 'en-US' : 'fr-FR', [settings.language])
}
