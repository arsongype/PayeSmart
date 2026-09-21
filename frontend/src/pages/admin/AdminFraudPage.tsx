import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, ShieldAlert } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import type { FraudAlert } from '../../models/FraudAlert.model'
import { FullPageLoader } from '../../components/common/Loader'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'

const riskStyles: Record<FraudAlert['riskLevel'], string> = {
  low: 'bg-emerald-500/10 text-black border border-emerald-500/30',
  medium: 'bg-amber-500/10 text-black border border-amber-500/30',
  high: 'bg-orange-500/10 text-black border border-orange-500/30',
  critical: 'bg-red-500/10 text-black border border-red-500/30',
}

export default function AdminFraudPage() {
  const locale = useLocale()
  const { t, formatMoney } = useTranslation()
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const alertsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(alerts.length / alertsPerPage))
  const visibleAlerts = alerts.slice((currentPage - 1) * alertsPerPage, currentPage * alertsPerPage)
  const pageItems: Array<number | 'ellipsis-start' | 'ellipsis-end'> = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : currentPage <= 3
      ? [1, 2, 3, 4, 'ellipsis-end', totalPages]
      : currentPage >= totalPages - 2
        ? [1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
        : [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages]

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await adminService.getFraudAlerts()
        setAlerts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('cannotLoadFraudAlerts'))
      } finally {
        setLoading(false)
      }
    }

    void loadAlerts()
  }, [])

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-black">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-black">{t('fraudAlerts')}</h1>
             <p className="text-sm text-black">{t('fraudMonitoring')}</p>
          </div>
        </div>

          {error && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-base text-black">
              {error}
            </div>
          )}

        {alerts.length === 0 ? (
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-10 text-center shadow-lg shadow-black/20">
             <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-black" />
            <p className="text-lg font-medium text-black">{t('noFraudAlerts')}</p>
            <p className="mt-2 text-sm text-black">{t('nonCompliantTransactionsAppear')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleAlerts.map((alert) => (
              <div key={alert.id} className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-1 text-sm font-medium text-black">
                        #{alert.transactionId}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${riskStyles[alert.riskLevel]}`}>
                        {alert.riskLevel.toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm text-black">
                        <ArrowUpRight className="h-3 w-3" />
                        {alert.channel}
                      </span>
                    </div>

                    <div className="text-lg font-semibold text-black">
                       {formatMoney(alert.amount, alert.currency)}
                    </div>
                     <p className="mt-1 text-base text-black">
                        {alert.sender?.name ?? t('unknownSender')} → {alert.recipient?.name ?? t('unknownRecipient')}
                      </p>
                  </div>

                  <div className="text-left lg:text-right">
                     <p className="text-sm uppercase tracking-wide text-black">{t('aiScore')}</p>
                     <p className="text-2xl font-bold text-black">{Math.round(alert.riskScore)}</p>
                     <p className="text-sm text-black">
                        {new Date(alert.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                   <p className="text-sm uppercase tracking-wide text-black">{t('mainReason')}</p>
                  <p className="mt-2 text-base text-black">{alert.reason}</p>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <nav className="flex flex-wrap items-center justify-center gap-2 pt-2" aria-label={t('pagination')}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('previous')}
                </button>
                {pageItems.map((item) => item === 'ellipsis-start' || item === 'ellipsis-end' ? (
                  <span key={item} className="px-1 text-sm text-black" aria-hidden="true">...</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    aria-current={currentPage === item ? 'page' : undefined}
                    className={`min-w-9 rounded-xl border px-3 py-2 text-sm font-medium transition ${currentPage === item ? 'border-primary-500 bg-primary-600 text-black' : 'border-gray-300 bg-white text-black hover:bg-gray-100'}`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  )
}



