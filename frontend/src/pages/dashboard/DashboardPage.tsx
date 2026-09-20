import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  Download,
  FileBarChart,
  FileText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { downloadReport, getDashboardReport, type DashboardReport } from '../../services/reporting.service'
import { useSettings } from '../../contexts/SettingsContext'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'

export default function DashboardPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const locale = useLocale()
  const { t } = useTranslation()
  const [report, setReport] = useState<DashboardReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    getDashboardReport()
      .then(setReport)
      .catch(() => setError(t('analyticsUnavailable')))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      await downloadReport(format)
    } catch {
      setError(t('exportUnavailable', { format: format.toUpperCase() }))
    } finally {
      setExporting(null)
    }
  }

  const totals = report?.totals ?? { volume: 0, transactions: 0, fraudRate: 0, revenue: 0 }
  const aiMetrics = report?.aiMetrics ?? { precision: null, recall: null, f1Score: null, analyzedTransactions: 0 }
  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: settings.currency, maximumFractionDigits: 0 }).format(amount)
    } catch {
      return `${amount.toLocaleString(locale)} ${settings.currency}`
    }
  }
  const formatMetric = (value: number | null) => value === null ? 'N/D' : `${(value * 100).toFixed(1)}%`

  const metricLabels = [t('precision'), t('recall'), t('f1Score'), t('analyzed')]

  return (
    <div className="page-enter space-y-8">
      <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-50 via-white to-blue-100 p-8 shadow-lg shadow-blue-900/10 sm:p-10">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black">{t('analyticsReporting')}</p>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-black">{t('overview')}</h1>
            <p className="text-lg text-black">{t('welcomeMessage', { name: user?.firstName ?? '' })}</p>
          </div>
          <div className="flex gap-3">
             <button type="button" onClick={() => void handleExport('csv')} disabled={exporting !== null} className="flex items-center gap-2 rounded-2xl border border-gray-400 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">
              <Download size={16} /> {t('exportCSV')}
            </button>
            <button type="button" onClick={() => void handleExport('pdf')} disabled={exporting !== null} className="flex items-center gap-2 rounded-2xl border border-gray-400 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">
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
          { label: t('volume'), value: formatMoney(totals.volume), icon: FileBarChart, color: 'text-black', bg: 'bg-primary-500/10' },
           { label: t('transactions'), value: totals.transactions.toLocaleString(locale), icon: CreditCard, color: 'text-black', bg: 'bg-sky-500/10' },
          { label: t('fraudRate'), value: `${totals.fraudRate.toFixed(1)}%`, icon: ShieldCheck, color: 'text-black', bg: 'bg-emerald-500/10' },
          { label: t('revenue'), value: formatMoney(totals.revenue), icon: BarChart3, color: 'text-black', bg: 'bg-amber-500/10' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="group relative overflow-hidden rounded-3xl border border-gray-300 bg-white p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-gray-400 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-base font-medium text-black">{stat.label}</p>
                <div className={`rounded-2xl p-2.5 ${stat.bg}`}>
                  <Icon size={22} className={stat.color} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-black">{stat.value}</p>
              <p className="mt-2 text-sm text-black">{t('realTimeConsolidatedData')}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-3xl border border-gray-300 bg-white p-6 shadow-lg shadow-black/20">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black">{t('volumesByPaymentMethod')}</h2>
              <p className="mt-1 text-base text-black">{t('channelsDescription')}</p>
            </div>
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <BarChart3 size={22} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(report?.channels ?? [])}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#000' }} />
              <YAxis tick={{ fontSize: 12, fill: '#000' }} />
              <Tooltip
                formatter={(value) => [formatMoney(Number(value)), t('volume')]}
                labelFormatter={(label) => label}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}
              />
              <Bar dataKey="amount" fill="#4d85ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="rounded-3xl border border-gray-300 bg-white p-6 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-black">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-black">{t('performance')}</h2>
                <p className="text-sm text-black">{t('apiMetricsEndpoint')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metricLabels.map((label, index) => (
               <div key={label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-black">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-black">{index === 0 ? formatMetric(aiMetrics.precision) : index === 1 ? formatMetric(aiMetrics.recall) : index === 2 ? formatMetric(aiMetrics.f1Score) : aiMetrics.analyzedTransactions.toLocaleString(locale)}</p>
               </div>
            ))}
          </div>
        </article>
      </section>

      {user?.role === 'ADMIN' && (
        <section aria-labelledby="admin-panel" className="rounded-3xl border border-gray-300 bg-white p-6 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <Users size={22} />
            </div>
            <div>
              <h2 id="admin-panel" className="text-xl font-semibold text-black">{t('adminPanel')}</h2>
               <p className="text-base text-black">{t('adminDescription')}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [t('activeUsers'), report?.admin?.activeUsers ?? 0, Users],
              [t('transactionsToReview'), report?.admin?.transactionsToReview ?? 0, CreditCard],
              [t('aiAlerts'), report?.admin?.aiAlerts ?? 0, AlertTriangle],
            ].map(([label, value, Icon]) => {
              const ItemIcon = Icon as typeof Users
                 return <div key={label as string} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-gray-300"><div><p className="text-base text-black">{label as string}</p><p className="mt-2 text-3xl font-bold text-black">{(value as number).toLocaleString(locale)}</p></div><div className="rounded-2xl bg-amber-500/10 p-2.5 text-black"><ItemIcon size={22} /></div></div>
            })}
          </div>
        </section>
      )}
    </div>
  )
}



