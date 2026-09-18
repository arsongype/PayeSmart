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
import { downloadReport, getDashboardReport, type DashboardReport } from '../../services/reporting.service'

export default function DashboardPage() {
  const { user } = useAuth()
  const [report, setReport] = useState<DashboardReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    getDashboardReport()
      .then(setReport)
      .catch(() => setError('Les données Analytics sont momentanément indisponibles.'))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    try {
      await downloadReport(format)
    } catch {
      setError(`L'export ${format.toUpperCase()} est indisponible.`)
    } finally {
      setExporting(null)
    }
  }

  const totals = report?.totals ?? { volume: 0, transactions: 0, fraudRate: 0, revenue: 0 }
  const aiMetrics = report?.aiMetrics ?? { precision: null, recall: null, f1Score: null, analyzedTransactions: 0 }
  const maxChannelAmount = Math.max(...(report?.channels.map((channel) => channel.amount) ?? [1]), 1)
  const formatMoney = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  const formatMetric = (value: number | null) => value === null ? 'N/D' : `${(value * 100).toFixed(1)}%`

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-400">Analytics & Reporting</p>
          <h1 className="text-2xl font-bold text-dark-50">Vue d'ensemble</h1>
          <p className="mt-1 text-dark-400">Bienvenue, {user?.firstName} ! Voici les indicateurs de votre activité.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void handleExport('csv')} disabled={exporting !== null} className="flex items-center gap-2 rounded-lg border border-dark-600 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 disabled:cursor-wait disabled:opacity-50">
            <Download size={16} /> Export CSV
          </button>
          <button type="button" onClick={() => void handleExport('pdf')} disabled={exporting !== null} className="flex items-center gap-2 rounded-lg border border-dark-600 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 disabled:cursor-wait disabled:opacity-50">
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {loading && <div className="rounded-lg border border-dark-700 bg-dark-800 px-4 py-3 text-sm text-dark-400">Chargement des données Analytics...</div>}

      <section aria-label="Indicateurs principaux" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Volume financier', value: formatMoney(totals.volume), icon: FileBarChart, color: 'text-primary-400' },
          { label: 'Transactions', value: totals.transactions.toLocaleString('fr-FR'), icon: CreditCard, color: 'text-sky-400' },
          { label: 'Taux de fraude', value: `${totals.fraudRate.toFixed(1)}%`, icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'Revenus nets', value: formatMoney(totals.revenue), icon: BarChart3, color: 'text-amber-400' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="rounded-xl border border-dark-700 bg-dark-800 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-dark-400">{stat.label}</p>
                <Icon size={19} className={stat.color} />
              </div>
              <p className="mt-3 text-2xl font-bold text-dark-50">{stat.value}</p>
              <p className="mt-2 text-sm text-dark-500">Données consolidées en temps réel</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-dark-50">Volumes par méthode de paiement</h2>
              <p className="mt-1 text-sm text-dark-500">Répartition des flux financiers consolidés</p>
            </div>
            <BarChart3 size={20} className="text-primary-400" />
          </div>
          <div className="space-y-5">
            {(report?.channels ?? []).map((item) => (
              <div key={item.channel}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-dark-300">{item.channel}</span>
                  <span className="font-medium text-dark-100">{formatMoney(item.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-dark-700">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max((item.amount / maxChannelAmount) * 100, 4)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-400" />
            <div>
              <h2 className="font-semibold text-dark-50">Performance IA</h2>
              <p className="mt-1 text-sm text-dark-500">GET /api/v1/metrics</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Précision', 'Rappel', 'F1-score', 'Analysées'].map((label) => (
              <div key={label} className="rounded-lg border border-dark-700 bg-dark-900/50 p-3">
                <p className="text-xs text-dark-500">{label}</p>
                <p className="mt-1 text-lg font-semibold text-dark-100">{label === 'Précision' ? formatMetric(aiMetrics.precision) : label === 'Rappel' ? formatMetric(aiMetrics.recall) : label === 'F1-score' ? formatMetric(aiMetrics.f1Score) : aiMetrics.analyzedTransactions.toLocaleString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {user?.role === 'ADMIN' && (
        <section aria-labelledby="admin-panel" className="rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="mb-5 flex items-center gap-3">
            <Users size={20} className="text-primary-400" />
            <div>
              <h2 id="admin-panel" className="font-semibold text-dark-50">Panneau d'administration</h2>
              <p className="mt-1 text-sm text-dark-500">Supervision des utilisateurs, transactions et alertes IA</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Utilisateurs actifs", report?.admin?.activeUsers ?? 0, Users], ['Transactions à vérifier', report?.admin?.transactionsToReview ?? 0, CreditCard], ['Alertes IA ouvertes', report?.admin?.aiAlerts ?? 0, AlertTriangle]].map(([label, value, Icon]) => {
              const ItemIcon = Icon as typeof Users
              return <div key={label as string} className="flex items-center justify-between rounded-lg border border-dark-700 bg-dark-900/50 p-4"><div><p className="text-sm text-dark-400">{label as string}</p><p className="mt-1 text-xl font-bold text-dark-50">{(value as number).toLocaleString('fr-FR')}</p></div><ItemIcon size={20} className="text-amber-400" /></div>
            })}
          </div>
        </section>
      )}
    </div>
  )
}
