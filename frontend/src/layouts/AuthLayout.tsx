import type { ReactNode } from 'react'
import { useTranslation } from '../utils/i18n'
import logo from '../assets/Logo.png'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 flex items-center justify-center p-4">
      <div className="flex w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="min-w-0 flex-1 p-4 md:p-6">
          {children}
        </div>
        <div className="hidden md:flex md:w-80 bg-gradient-to-br from-blue-800 to-blue-700 text-white flex-col items-center justify-center p-6 text-center">
          <div className="mb-5 rounded-xl bg-white px-5 py-3 shadow-sm">
            <img src={logo} alt={t('paysmart')} className="h-auto w-40 object-contain" />
          </div>
          <h2 className="text-xl font-bold mb-2">Bienvenue</h2>
          <p className="text-sm leading-6 text-white">
            Rejoignez la plateforme de paiement sécurisée.
          </p>
        </div>
      </div>
    </div>
  )
}
