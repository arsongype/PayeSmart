import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from './Button'

export interface TrustScoreData {
  trust_score: number
  risk_level: string
  factors: Record<string, unknown>
  recommendation: string
}

interface TrustScorePanelProps {
  score: TrustScoreData | null
  onRecalculate: () => void
  loading: boolean
}

export function TrustScorePanel({ score, onRecalculate, loading }: TrustScorePanelProps) {
  return (
    <div className="mb-6 rounded-xl border border-primary-600/30 bg-primary-600/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-dark-100"><ShieldCheck className="h-5 w-5 text-primary-400" />Trust Score temporaire</p>
          <p className="mt-1 text-xs text-dark-400">Score recalculé à partir des contrôles disponibles.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onRecalculate} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Calcul...' : 'Recalculer'}
        </Button>
      </div>
      {score ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary-500 text-2xl font-bold text-primary-300">{Math.round(score.trust_score)}</div>
          <div>
            <p className="text-sm font-semibold text-dark-100">Risque : <span className="text-primary-300">{score.risk_level}</span></p>
            <p className="mt-1 text-sm text-dark-300">{score.recommendation}</p>
            <p className="mt-2 text-xs text-dark-500">Documents analysés : {String(score.factors.documents_analyzed ?? 0)} · Alertes : {String(score.factors.fraud_indicators_count ?? 0)}</p>
          </div>
        </div>
      ) : <p className="mt-4 text-sm text-dark-400">Aucun score calculé pour le moment.</p>}
    </div>
  )
}
