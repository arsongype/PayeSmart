import type { ReactNode } from 'react'
import { useTranslation } from '../utils/i18n'
import logo from '../assets/Logo.png'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex-1 p-6">
          {children}
        </div>
        <div className="hidden md:flex md:w-80 bg-indigo-500 text-white flex-col items-center justify-center p-6 text-center">
          <img src={logo} alt={t('paysmart')} className="h-auto w-32 object-contain mb-4" />
          <h2 className="text-xl font-bold mb-2">Bienvenue</h2>
          <p className="text-sm text-white/80">
            Rejoignez la plateforme de paiement sécurisée.
          </p>
        </div>
      </div>
    </div>
  )
}
