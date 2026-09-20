import { useState, useEffect } from 'react'
import { Wallet, CreditCard, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { walletService } from '../../services/wallet.service'
import { paymentService } from '../../services/payment.service'
import { FullPageLoader } from '../../components/common/Loader'
import type { Wallet as WalletType } from '../../models/User.model'
import type { PaymentTransaction } from '../../services/payment.service'
import { useTranslation } from '../../utils/i18n'

export default function WalletPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [history, setHistory] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [detailTransaction, setDetailTransaction] = useState<PaymentTransaction | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const historyPageSize = 5
  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize))
  const visibleHistory = history.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)

  const loadHistory = async () => {
    try {
      const data = await paymentService.history()
      setHistory(data)
      setHistoryPage(1)
    } catch {
      // history loading failed silently
    }
  }

  useEffect(() => {
    if (user) {
      walletService.getWallet(user.id).then(setWallet).finally(() => setLoading(false))
      void loadHistory()
    }
  }, [user])

  const openDetail = async (transaction: PaymentTransaction) => {
    setDetailLoading(true)
    setDetailTransaction(transaction)
    try {
      const updated = await paymentService.get(transaction.id)
      setDetailTransaction(updated)
    } catch {
      // keep basic transaction data if detail fetch fails
    } finally {
      setDetailLoading(false)
    }
  }

  const downloadReceipt = async (transaction: PaymentTransaction) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(t('receiptTitle'), 14, 20)
    doc.setFontSize(12)
    const lines = [
      t('receiptReference', { ref: transaction.externalReference ?? `#${transaction.id}` }),
      t('receiptAmount', { amount: Number(transaction.amount).toFixed(2), currency: transaction.currency }),
      t('receiptChannel', { channel: transaction.channel }),
      t('receiptStatus', { status: transaction.status }),
      t('receiptDate', { date: new Date(transaction.createdAt).toLocaleString() }),
    ]
    doc.text(lines, 14, 32, { maxWidth: 180 })
    doc.save(`paysmart-recu-${transaction.id}.pdf`)
  }

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

        <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black">{t('transactionHistory')}</h2>
              <p className="mt-1 text-base text-black">{t('viewLastTransactions')}</p>
            </div>
            <button type="button" onClick={() => void loadHistory()} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100">
              {t('refresh')}
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-base text-black">{t('noTransactions')}</p>
          ) : (
            <div className="space-y-3">
              {visibleHistory.map((transaction) => {
                const outgoing = transaction.direction === 'OUTGOING'
                return (
                  <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-gray-50 p-4 transition hover:border-gray-400">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2 ${outgoing ? 'bg-red-500/10 text-black' : 'bg-emerald-500/10 text-black'}`}>
                        {outgoing ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-base font-medium text-black">{transaction.channel} · {transaction.externalReference || `#${transaction.id}`}</p>
                          <p className="text-sm text-black">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-black">{outgoing ? '-' : '+'}{Number(transaction.amount).toFixed(2)} {transaction.currency}</p>
                        <p className={`text-sm ${transaction.status === 'COMPLETED' ? 'text-black' : transaction.status === 'FAILED' ? 'text-black' : 'text-black'}`}>{transaction.status}</p>
                      </div>
                      <button type="button" onClick={() => openDetail(transaction)} className="rounded-xl border border-gray-300 bg-white p-2 text-black hover:bg-gray-100">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage === 1} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">Précédent</button>
              {Array.from({ length: historyTotalPages }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" onClick={() => setHistoryPage(page)} className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${page === historyPage ? 'border-primary-500 bg-primary-500 text-black' : 'border-gray-300 bg-white text-black'}`}>{page}</button>
              ))}
              <button type="button" onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))} disabled={historyPage === historyTotalPages} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">Suivant</button>
            </div>
          )}
        </section>
      </div>

      {detailTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black">{t('transactionDetails')}</h3>
              <button type="button" onClick={() => setDetailTransaction(null)} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100">
                {t('closeMenu')}
              </button>
            </div>
            {detailLoading && <p className="text-base text-black">{t('loading')}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">Référence</p>
                <p className="mt-1 text-base font-medium text-black font-mono">{detailTransaction.externalReference || `#${detailTransaction.id}`}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('channel')}</p>
                <p className="mt-1 text-base font-medium text-black">{detailTransaction.channel}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('status')}</p>
                <p className="mt-1 text-base font-medium text-black">{detailTransaction.status}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('amount')}</p>
                <p className="mt-1 text-base font-medium text-black">{Number(detailTransaction.amount).toFixed(2)} {detailTransaction.currency}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">Date</p>
                <p className="mt-1 text-base font-medium text-black">{new Date(detailTransaction.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">Direction</p>
                <p className="mt-1 text-base font-medium text-black">{detailTransaction.direction || '-'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black">Analyse risque / IA</p>
              <div className="mt-2 space-y-2 text-sm text-black">
                <p>Score de risque : {detailTransaction.metadata?.riskScore ?? '-'}</p>
                <p>Niveau : {detailTransaction.metadata?.riskLevel ?? '-'}</p>
                <p>Décision : {detailTransaction.metadata?.riskDecision ?? '-'}</p>
                <p>Raison : {detailTransaction.metadata?.riskReasons?.join(' ') ?? detailTransaction.failureReason ?? '-'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { if (detailTransaction) void downloadReceipt(detailTransaction) }} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100">
                {t('downloadReceipt')}
              </button>
              <button type="button" onClick={() => window.print()} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100">
                {t('print')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



