import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  FileBarChart,
  FileText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { downloadReport, getDashboardReport, type DashboardReport } from '../../services/reporting.service'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'

export default function DashboardPage() {
  const { user } = useAuth()
  const locale = useLocale()
  const { t, formatMoney } = useTranslation()
  const [report, setReport] = useState<DashboardReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getDashboardReport()
      .then(setReport)
      .catch(() => setError(t('analyticsUnavailable')))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadReport()
    } catch (error) {
      setError(error instanceof Error ? error.message : t('exportUnavailable', { format: 'PDF' }))
    } finally {
      setExporting(false)
    }
  }

  const totals = report?.totals ?? { volume: 0, transactions: 0, fraudRate: 0, revenue: 0 }
  const aiMetrics = report?.aiMetrics ?? { precision: null, recall: null, f1Score: null, analyzedTransactions: 0 }
  const reportCurrency = user?.wallet?.currency || 'EUR'
  const formatMetric = (value: number | null) => value === null ? 'N/D' : `${(value * 100).toFixed(1)}%`

  const metricLabels = [t('precision'), t('recall'), t('f1Score'), t('analyzed')]

  return (
    <div className="page-enter min-w-0 space-y-8">
      <header className="relative min-w-0 overflow-hidden rounded-3xl bg-linear-to-br from-blue-50 via-white to-blue-100 p-5 shadow-lg shadow-blue-900/10 sm:p-8 lg:p-10">
        <div className="relative z-10 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black">{t('analyticsReporting')}</p>
            <h1 className="wrap-break-word font-serif text-3xl font-bold tracking-tight text-black sm:text-4xl">{t('overview')}</h1>
            <p className="wrap-break-word text-base text-black sm:text-lg">{t('welcomeMessage', { name: user?.firstName ?? '' })}</p>
          </div>
          <div className="flex w-full shrink-0 sm:w-auto">
            <button type="button" onClick={() => void handleExport()} disabled={exporting} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-400 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-5">
              <FileText size={16} /> {t('exportPDF')}
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl" />
      </header>

      {error && <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-base text-black">{error}</div>}
      {loading && <div className="rounded-2xl border border-gray-300 bg-gray-50 px-5 py-4 text-base text-black">{t('loadingAnalyticsData')}</div>}

      <section aria-label={t('overview')} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('volume'), value: formatMoney(totals.volume, reportCurrency), icon: FileBarChart, color: 'text-black', bg: 'bg-primary-500/10' },
           { label: t('transactions'), value: totals.transactions.toLocaleString(locale), icon: CreditCard, color: 'text-black', bg: 'bg-sky-500/10' },
          { label: t('fraudRate'), value: `${totals.fraudRate.toFixed(1)}%`, icon: ShieldCheck, color: 'text-black', bg: 'bg-emerald-500/10' },
          { label: t('revenue'), value: formatMoney(totals.revenue, reportCurrency), icon: BarChart3, color: 'text-black', bg: 'bg-amber-500/10' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="group relative min-w-0 overflow-hidden rounded-3xl border border-gray-300 bg-white p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-gray-400 hover:shadow-xl sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-medium text-black">{stat.label}</p>
                <div className={`rounded-2xl p-2.5 ${stat.bg}`}>
                  <Icon size={22} className={stat.color} />
                </div>
              </div>
              <p className="mt-4 wrap-break-word text-2xl font-bold text-black sm:text-3xl">{stat.value}</p>
              <p className="mt-2 wrap-break-word text-sm text-black">{t('realTimeConsolidatedData')}</p>
            </article>
          )
        })}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="min-w-0 rounded-3xl border border-gray-300 bg-white p-5 shadow-lg shadow-black/20 sm:p-6">
          <div className="mb-6 flex min-w-0 items-start justify-between gap-3 sm:mb-8">
            <div className="min-w-0">
              <h2 className="wrap-break-word text-lg font-semibold text-black sm:text-xl">{t('volumesByPaymentMethod')}</h2>
              <p className="mt-1 wrap-break-word text-sm text-black sm:text-base">{t('channelsDescription')}</p>
            </div>
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <BarChart3 size={22} />
            </div>
          </div>
          <div className="h-64 min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(report?.channels ?? [])} margin={{ top: 8, right: 4, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#000' }} />
              <YAxis tick={{ fontSize: 12, fill: '#000' }} />
              <Tooltip
                formatter={(value) => [formatMoney(Number(value), reportCurrency), t('volume')]}
                labelFormatter={(label) => label}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}
              />
              <Bar dataKey="amount" fill="#4d85ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="min-w-0 rounded-3xl border border-gray-300 bg-white p-5 shadow-lg shadow-black/20 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-black">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="wrap-break-word text-lg font-semibold text-black sm:text-xl">{t('performance')}</h2>
                <p className="wrap-break-word text-sm text-black">{t('apiMetricsEndpoint')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metricLabels.map((label, index) => (
              <div key={label} className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <p className="wrap-break-word text-sm text-black">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-black">{index === 0 ? formatMetric(aiMetrics.precision) : index === 1 ? formatMetric(aiMetrics.recall) : index === 2 ? formatMetric(aiMetrics.f1Score) : aiMetrics.analyzedTransactions.toLocaleString(locale)}</p>
               </div>
            ))}
          </div>
        </article>
      </section>

      {user?.role === 'ADMIN' && (
        <section aria-labelledby="admin-panel" className="min-w-0 rounded-3xl border border-gray-300 bg-white p-5 shadow-lg shadow-black/20 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <Users size={22} />
            </div>
            <div className="min-w-0">
              <h2 id="admin-panel" className="wrap-break-word text-lg font-semibold text-black sm:text-xl">{t('adminPanel')}</h2>
               <p className="wrap-break-word text-sm text-black sm:text-base">{t('adminDescription')}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [t('activeUsers'), report?.admin?.activeUsers ?? 0, Users],
              [t('transactionsToReview'), report?.admin?.transactionsToReview ?? 0, CreditCard],
              [t('aiAlerts'), report?.admin?.aiAlerts ?? 0, AlertTriangle],
            ].map(([label, value, Icon]) => {
              const ItemIcon = Icon as typeof Users
                 return <div key={label as string} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300 sm:p-5"><div className="min-w-0"><p className="wrap-break-word text-sm text-black sm:text-base">{label as string}</p><p className="mt-2 text-2xl font-bold text-black sm:text-3xl">{(value as number).toLocaleString(locale)}</p></div><div className="shrink-0 rounded-2xl bg-amber-500/10 p-2.5 text-black"><ItemIcon size={22} /></div></div>
            })}
          </div>
        </section>
      )}
    </div>
  )
}



