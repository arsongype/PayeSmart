import { useState, useEffect } from 'react'
import { BarChart3, Users, Wallet, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { getDashboardReport } from '../../services/reporting.service'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'

export default function AdminDashboardPage() {
  const { t, formatMoney } = useTranslation()
  const [stats, setStats] = useState<{ totals: { volume: number; transactions: number; fraudRate: number; revenue: number }; channels: Array<{ channel: string; amount: number; transactions: number }>; aiMetrics: { precision: number | null; recall: number | null; f1Score: number | null; analyzedTransactions: number } | null; admin: { activeUsers: number; transactionsToReview: number; aiAlerts: number } | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const report = await getDashboardReport()
        setStats(report)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorLoadingDashboard'))
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
              <BarChart3 className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-black">{t('adminDashboard')}</h1>
          </div>
          <p className="text-lg text-black">{t('adminDashboardSubtitle')}</p>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-base text-black">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('totalVolume'), value: formatMoney(stats?.totals.volume ?? 0), icon: Wallet },
            { label: t('totalTransactions'), value: String(stats?.totals.transactions ?? 0), icon: ArrowUpRight },
            { label: t('fraudRate'), value: `${stats?.totals.fraudRate ?? 0}%`, icon: AlertTriangle },
            { label: t('revenue'), value: formatMoney(stats?.totals.revenue ?? 0), icon: BarChart3 },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-black">
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-black">{item.value}</p>
            </div>
          ))}
        </div>

        {stats?.admin && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-black">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">{t('activeUsers')}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-black">{stats.admin.activeUsers}</p>
            </div>
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-black">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">{t('transactionsToReview')}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-black">{stats.admin.transactionsToReview}</p>
            </div>
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-black">
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm font-medium">{t('aiAlerts')}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-black">{stats.admin.aiAlerts}</p>
            </div>
          </div>
        )}

        {stats?.aiMetrics && (
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <h3 className="text-xl font-semibold text-black mb-4">{t('aiModelPerformance')}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="text-sm text-black">{t('precision')}</span>
                <p className="text-2xl font-bold text-black">{(stats.aiMetrics.precision ?? 0).toFixed(4)}</p>
              </div>
              <div>
                <span className="text-sm text-black">{t('recall')}</span>
                <p className="text-2xl font-bold text-black">{(stats.aiMetrics.recall ?? 0).toFixed(4)}</p>
              </div>
              <div>
                <span className="text-sm text-black">{t('f1Score')}</span>
                <p className="text-2xl font-bold text-black">{(stats.aiMetrics.f1Score ?? 0).toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
