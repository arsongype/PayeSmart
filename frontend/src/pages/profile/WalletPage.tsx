import { useState, useEffect } from 'react'
import { Wallet, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { walletService } from '../../services/wallet.service'
import { FullPageLoader } from '../../components/common/Loader'
import type { Wallet as WalletType } from '../../models/User.model'

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      walletService.getWallet(user.id).then(setWallet).finally(() => setLoading(false))
    }
  }, [user])

  if (loading) return <FullPageLoader />

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-50">Mon Portefeuille</h1>
          <p className="text-dark-400 mt-1">Consultez votre solde et vos limites</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-5 w-5 text-primary-500" />
              <p className="text-sm text-dark-400">Solde actuel</p>
            </div>
            <p className="text-3xl font-bold text-dark-50">{wallet ? Number(wallet.balance).toFixed(2) : '0.00'} {wallet?.currency || 'EUR'}</p>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              <p className="text-sm text-dark-400">Limite journalière</p>
            </div>
            <p className="text-3xl font-bold text-dark-50">{wallet ? Number(wallet.dailyLimit).toFixed(2) : '0.00'} {wallet?.currency || 'EUR'}</p>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-primary-500" />
              <p className="text-sm text-dark-400">Limite mensuelle</p>
            </div>
            <p className="text-3xl font-bold text-dark-50">{wallet ? Number(wallet.monthlyLimit).toFixed(2) : '0.00'} {wallet?.currency || 'EUR'}</p>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-dark-50">Informations du portefeuille</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-dark-400">Numéro de portefeuille</p>
              <p className="text-sm text-dark-100 font-mono">{wallet?.walletNumber || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-dark-400">Statut</p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                wallet?.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                wallet?.status === 'SUSPENDED' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {wallet?.status || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
