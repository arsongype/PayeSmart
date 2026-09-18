import { useState, useEffect } from 'react'
import { Wallet, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { walletService } from '../../services/wallet.service'
import { FullPageLoader } from '../../components/common/Loader'
import type { Wallet as WalletType } from '../../models/User.model'
import { useTranslation } from '../../utils/i18n'

export default function WalletPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      walletService.getWallet(user.id).then(setWallet).finally(() => setLoading(false))
    }
  }, [user])

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-black">{t('myWallet')}</h1>
          <p className="text-lg text-black">{t('viewBalanceLimits')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                <Wallet className="h-5 w-5" />
              </div>
               <p className="text-base font-medium text-black">{t('currentBalance')}</p>
            </div>
            <p className="text-3xl font-bold text-black">{wallet ? Number(wallet.balance).toFixed(2) : '0.00'} {wallet?.currency || 'EUR'}</p>
          </div>
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-black">
                <TrendingUp className="h-5 w-5" />
              </div>
               <p className="text-base font-medium text-black">{t('dailyLimit')}</p>
            </div>
            <p className="text-3xl font-bold text-black">{wallet ? Number(wallet.dailyLimit).toFixed(2) : '0.00'} {wallet?.currency || 'EUR'}</p>
          </div>
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-amber-500/10 p-2.5 text-black">
                <CreditCard className="h-5 w-5" />
              </div>
               <p className="text-base font-medium text-black">{t('monthlyLimit')}</p>
            </div>
            <p className="text-3xl font-bold text-black">{wallet ? Number(wallet.monthlyLimit).toFixed(2) : '0.00'} {wallet?.currency || 'EUR'}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <AlertCircle className="h-5 w-5" />
            </div>
              <h2 className="text-xl font-semibold text-black">{t('walletInfo')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
               <p className="text-sm text-black">{t('walletNumber')}</p>
              <p className="mt-1 text-base font-medium text-black font-mono">{wallet?.walletNumber || '-'}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
               <p className="text-sm text-black">{t('status')}</p>
              <div className="mt-1">
                <span className={`inline-flex text-sm px-3 py-1.5 rounded-full font-medium ${
                  wallet?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-black border border-emerald-500/30' :
                  wallet?.status === 'SUSPENDED' ? 'bg-amber-500/10 text-black border border-amber-500/30' :
                  'bg-red-500/10 text-black border border-red-500/30'
                }`}>
                  {wallet?.status || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



