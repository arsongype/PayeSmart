import { useState, useEffect } from 'react'
import { BarChart3, Users, Wallet, AlertTriangle, ArrowUpRight, Coins } from 'lucide-react'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDashboardReport, type DashboardReport } from '../../services/reporting.service'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'

export default function AdminDashboardPage() {
  const { t, formatMoney } = useTranslation()
  const [stats, setStats] = useState<DashboardReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const transactionFees = stats?.admin?.transactionFees ?? []
  const transactionFeesDisplay = transactionFees.length > 0
    ? transactionFees.map((fee) => formatMoney(fee.amount, fee.currency, fee.currency)).join(' · ')
    : formatMoney(0)
  const formatMetric = (value: number | null) => value === null ? 'N/D' : `${(value * 100).toFixed(1)}%`

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-black">{t('adminDashboard')}</h1>
              <p className="mt-1 text-lg text-black">{t('adminDashboardSubtitle')}</p>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-base text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: t('totalVolume'), value: formatMoney(stats?.totals.volume ?? 0), icon: Wallet },
            { label: t('totalTransactions'), value: String(stats?.totals.transactions ?? 0), icon: ArrowUpRight },
            { label: t('fraudRate'), value: `${stats?.totals.fraudRate ?? 0}%`, icon: AlertTriangle },
            { label: t('revenue'), value: formatMoney(stats?.totals.revenue ?? 0), icon: BarChart3 },
            { label: t('collectedTransactionFees'), value: transactionFeesDisplay, icon: Coins },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-black">
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="mt-3 wrap-break-word text-2xl font-bold text-black">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black">{t('transactionRatesByChannel')}</h2>
            <p className="mt-1 text-sm text-gray-700">{t('allClientsTransactionScope')}</p>
          </div>
          {(stats?.admin?.transactionRates?.length ?? 0) > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.admin?.transactionRates ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#000' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#000' }} />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${Number(value).toFixed(2)}% (${item.payload.transactions})`,
                      t('transactionShare'),
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}
                  />
                  <Bar dataKey="rate" fill="#4d85ee" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-gray-700">{t('noTransactions')}</p>
          )}
        </section>

        {stats?.admin && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className="text-2xl font-bold text-black">{formatMetric(stats.aiMetrics.precision)}</p>
              </div>
              <div>
                <span className="text-sm text-black">{t('recall')}</span>
                <p className="text-2xl font-bold text-black">{formatMetric(stats.aiMetrics.recall)}</p>
              </div>
              <div>
                <span className="text-sm text-black">{t('f1Score')}</span>
                <p className="text-2xl font-bold text-black">{formatMetric(stats.aiMetrics.f1Score)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
