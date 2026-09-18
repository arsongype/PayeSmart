import type { ReactNode } from 'react'
import { AuthProvider } from './AuthProvider'
import { SettingsProvider } from './SettingsContext'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SettingsProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SettingsProvider>
  )
}

