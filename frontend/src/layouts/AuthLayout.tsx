import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-dark-900 flex">
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-dark-950">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-dark-900 to-dark-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)]" />

        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <g stroke="url(#circuitGradient)" fill="none" strokeWidth="1">
              <path d="M200,100 L400,100 L400,200 L600,200" />
              <path d="M100,300 L300,300 L300,400 L500,400" />
              <path d="M400,500 L600,500 L600,400" />
              <path d="M600,100 L600,250" />
              <path d="M200,500 L200,350" />
              <circle cx="400" cy="300" r="8" fill="#3b82f6" />
              <circle cx="600" cy="200" r="4" fill="#60a5fa" />
              <circle cx="300" cy="400" r="4" fill="#60a5fa" />
              <circle cx="200" cy="300" r="3" fill="#93c5fd" />
              <circle cx="600" cy="500" r="6" fill="#3b82f6" />
              <circle cx="400" cy="100" r="3" fill="#93c5fd" />
            </g>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
            <ShieldCheck
              className="relative h-32 w-32 text-primary-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              strokeWidth={1}
            />
          </div>
          <h1 className="text-4xl font-bold text-dark-50 mb-4">Paysmart</h1>
          <p className="text-lg text-dark-300 max-w-md">
            La plateforme de paiement sécurisée pour vos transactions en Afrique
          </p>
          <div className="mt-8 flex items-center gap-6 text-dark-400">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm text-dark-300">Sécurisé</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="text-sm text-dark-300">Rapide</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-dark-300">Panafricain</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}