import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, ShieldAlert } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import type { FraudAlert } from '../../models/FraudAlert.model'
import { FullPageLoader } from '../../components/common/Loader'

const riskStyles: Record<FraudAlert['riskLevel'], string> = {
  low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  high: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
  critical: 'bg-red-500/10 text-red-400 border border-red-500/30',
}

export default function AdminFraudPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await adminService.getFraudAlerts()
        setAlerts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les alertes de fraude')
      } finally {
        setLoading(false)
      }
    }

    void loadAlerts()
  }, [])

  if (loading) return <FullPageLoader />

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-50">Alertes de fraude</h1>
            <p className="text-sm text-dark-400">Suivi des transactions signalées par l’analyse IA.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dark-700 bg-dark-800 p-10 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-dark-500" />
            <p className="text-lg font-medium text-dark-200">Aucune alerte de fraude en cours</p>
            <p className="mt-2 text-sm text-dark-400">Les transactions non conformes apparaîtront ici dès que l’IA les détecte.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-dark-900 px-2.5 py-1 text-xs font-medium text-dark-300">
                        #{alert.transactionId}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${riskStyles[alert.riskLevel]}`}>
                        {alert.riskLevel.toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-dark-600 bg-dark-900 px-2.5 py-1 text-xs text-dark-300">
                        <ArrowUpRight className="h-3 w-3" />
                        {alert.channel}
                      </span>
                    </div>

                    <div className="text-lg font-semibold text-dark-100">
                      {alert.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {alert.currency}
                    </div>
                    <p className="mt-1 text-sm text-dark-400">
                      {alert.sender?.name ?? 'Expéditeur inconnu'} → {alert.recipient?.name ?? 'Destinataire inconnu'}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-xs uppercase tracking-wide text-dark-500">Score IA</p>
                    <p className="text-2xl font-bold text-dark-50">{Math.round(alert.riskScore)}</p>
                    <p className="text-xs text-dark-400">
                      {new Date(alert.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-dark-700 bg-dark-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-dark-500">Motif principal</p>
                  <p className="mt-2 text-sm text-dark-200">{alert.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}