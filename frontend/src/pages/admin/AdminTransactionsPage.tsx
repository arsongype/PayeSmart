import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react'
import { paymentService, type PaymentTransaction } from '../../services/payment.service'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'
import { Button } from '../../components/common/Button'

export default function AdminTransactionsPage() {
  const { t, formatMoney } = useTranslation()
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const visible = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await paymentService.history()
        setTransactions(data.reverse())
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorLoadingTransactions'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [t])

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <RefreshCcw className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-black">{t('allTransactions')}</h1>
          </div>
          <p className="text-lg text-black">{t('allTransactionsSubtitle')}</p>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-base text-black">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-gray-300 bg-gray-50 shadow-lg shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="text-left px-6 py-4 text-base font-medium text-black">{t('id')}</th>
                  <th className="text-left px-6 py-4 text-base font-medium text-black">{t('amount')}</th>
                  <th className="text-left px-6 py-4 text-base font-medium text-black">{t('status')}</th>
                  <th className="text-left px-6 py-4 text-base font-medium text-black">{t('channel')}</th>
                  <th className="text-left px-6 py-4 text-base font-medium text-black">{t('direction')}</th>
                  <th className="text-right px-6 py-4 text-base font-medium text-black">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {visible.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-gray-100">
                    <td className="px-6 py-4 text-base text-black">#{tx.id}</td>
                    <td className="px-6 py-4 text-base text-black">{formatMoney(tx.amount, tx.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium border ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-black border-emerald-500/30' :
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-black border-amber-500/30' :
                        'bg-red-500/10 text-black border-red-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-base text-black">{tx.channel}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium border ${
                        tx.direction === 'INCOMING' ? 'bg-emerald-500/10 text-black border-emerald-500/30' : 'bg-red-500/10 text-black border-red-500/30'
                      }`}>
                        {tx.direction === 'INCOMING' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {tx.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-base text-black">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-black">
                      <p className="text-base">{t('noTransactions')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-gray-300 p-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                  {t('previous')}
                </Button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`min-w-9 rounded-xl border px-3 py-2 text-sm font-medium transition ${currentPage === page ? 'border-primary-500 bg-primary-600 text-black' : 'border-gray-300 bg-white text-black hover:bg-gray-100'}`}>
                    {page}
                  </button>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                  {t('next')}
                </Button>
              </div>
          )}
        </div>
      </div>
    </div>
  )
}
