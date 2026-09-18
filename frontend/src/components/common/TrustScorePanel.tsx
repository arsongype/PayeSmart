import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from './Button'
import { useTranslation } from '../../utils/i18n'

export interface TrustScoreData {
  trust_score?: number
  trustScore?: number
  risk_level?: string
  riskLevel?: string
  factors: Record<string, unknown>
  recommendation: string
}

interface TrustScorePanelProps {
  score: TrustScoreData | null
  onRecalculate: () => void
  loading: boolean
}

export function TrustScorePanel({ score, onRecalculate, loading }: TrustScorePanelProps) {
  const { t } = useTranslation()
  const trustScore = score?.trust_score ?? score?.trustScore
  const riskLevel = score?.risk_level ?? score?.riskLevel
  const safeTrustScore = typeof trustScore === 'number' && Number.isFinite(trustScore) ? Math.round(trustScore) : null
  const documentsAnalyzed = Number(score?.factors.documents_analyzed ?? 0)
  const fraudIndicators = Number(score?.factors.fraud_indicators_count ?? 0)

  return (
    <div className="mb-8 rounded-3xl border border-primary-500/30 bg-primary-500/5 p-6 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold text-black">
            <span className="rounded-xl bg-primary-500/10 p-1.5 text-black">
              <ShieldCheck className="h-5 w-5" />
            </span>
            {t('temporaryTrustScore')}
          </p>
          <p className="mt-1 text-sm text-black">{t('trustScoreRecalculated')}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onRecalculate} disabled={loading} className="rounded-xl border border-gray-300">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t('calculating') : t('recalculate')}
        </Button>
      </div>
      {score && safeTrustScore !== null ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary-500 text-3xl font-bold text-black shadow-lg shadow-primary-500/20">
            {safeTrustScore}
          </div>
          <div>
            <p className="text-base font-semibold text-black">{t('riskLabel', { risk: riskLevel ?? 'INCONNU' })}</p>
            <p className="mt-1 text-base text-black">{score.recommendation}</p>
            <p className="mt-2 text-sm text-black">{t('documentsAndAlerts', { docs: Number.isFinite(documentsAnalyzed) ? documentsAnalyzed : 0, alerts: Number.isFinite(fraudIndicators) ? fraudIndicators : 0 })}</p>
          </div>
        </div>
      ) : <p className="mt-4 text-base text-black">{t('noScore')}</p>}
    </div>
  )
}



