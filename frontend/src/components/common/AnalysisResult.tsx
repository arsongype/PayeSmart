import { AlertTriangle, CheckCircle2, Eye, FileSearch, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from './Button'
import { useTranslation } from '../../utils/i18n'

export interface DocumentAnalysis {
  documentType?: string
  document_type?: string
  is_valid?: boolean
  confidenceScore?: number
  confidence_score?: number
  extractedData?: Record<string, unknown>
  extracted_data?: Record<string, unknown>
  fraudIndicators?: string[]
  fraud_indicators?: string[]
  trustScoreImpact?: number
  trust_score_impact?: number
  riskScore?: number
  risk_score?: number
  riskLevel?: string
  risk_level?: string
}

interface AnalysisResultProps {
  analysis?: DocumentAnalysis
  status?: 'NON_VERIFIE' | 'EN_COURS' | 'VERIFIE' | 'REJECTED' | 'APPROVED'
  onRecalculate?: () => void
  recalculating?: boolean
}

const readableLabel = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function AnalysisResult({ analysis, onRecalculate, recalculating = false }: AnalysisResultProps) {
  const { t } = useTranslation()

  const effectiveAnalysis = analysis

  if (!effectiveAnalysis) {
    return <p className="text-sm text-black">{t('analysisNotAvailable')}</p>
  }

  const confidenceValue = effectiveAnalysis.confidenceScore ?? effectiveAnalysis.confidence_score ?? 0
  const extractedData = effectiveAnalysis.extractedData ?? effectiveAnalysis.extracted_data ?? {}
  const fraudIndicators = Array.isArray(effectiveAnalysis.fraudIndicators ?? effectiveAnalysis.fraud_indicators)
    ? (effectiveAnalysis.fraudIndicators ?? effectiveAnalysis.fraud_indicators ?? [])
    : []
  const trustImpactValue = effectiveAnalysis.trustScoreImpact ?? effectiveAnalysis.trust_score_impact ?? 0
  const riskScoreValue = effectiveAnalysis.riskScore ?? effectiveAnalysis.risk_score
  const riskLevel = effectiveAnalysis.riskLevel ?? effectiveAnalysis.risk_level
  const isValid = effectiveAnalysis.is_valid ?? false
  const confidencePercent = Number.isFinite(confidenceValue) ? Math.round(confidenceValue * 100) : 0
  const trustImpact = Number.isFinite(trustImpactValue) ? trustImpactValue : 0
  const riskScore = typeof riskScoreValue === 'number' && Number.isFinite(riskScoreValue) ? riskScoreValue : undefined

  return (
    <div className="mt-4 border-t border-gray-300 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-black">
          <FileSearch className="h-4 w-4 text-black" /> {t('autoAnalysisResult')}
        </h3>
        {onRecalculate && (
          <Button type="button" size="sm" variant="outline" onClick={onRecalculate} disabled={recalculating}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? t('calculating') : t('recalculate')}
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={isValid ? ShieldCheck : ShieldAlert} label={t('validity')} value={isValid ? t('valid') : t('toVerify')} positive={isValid} />
        <Metric icon={Eye} label={t('readability')} value={`${confidencePercent}%`} positive={confidencePercent >= 70} />
        <Metric icon={ShieldCheck} label={t('trustImpact')} value={`${trustImpact >= 0 ? '+' : ''}${Math.round(trustImpact)} pts`} positive={trustImpact >= 0} />
        <Metric icon={AlertTriangle} label={t('enterpriseRisk')} value={riskScore === undefined ? t('notCalculated') : `${riskLevel ?? 'N/A'} (${Math.round(riskScore)}/100)`} positive={riskScore !== undefined && riskScore < 30} />
        <Metric icon={fraudIndicators.length ? AlertTriangle : CheckCircle2} label={t('falsification')} value={fraudIndicators.length ? `${fraudIndicators.length} alerte(s)` : t('noAlerts')} positive={!fraudIndicators.length} />
      </div>

      {Object.keys(extractedData).length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black">{t('ocrData')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-black">{readableLabel(key)}</span>
                <span className="truncate text-right font-medium text-black">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fraudIndicators.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-black">{t('controlAlerts')}</p>
          <ul className="list-inside list-disc text-sm text-black">
            {fraudIndicators.map((indicator) => <li key={indicator}>{readableLabel(indicator)}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value, positive }: { icon: typeof CheckCircle2; label: string; value: string; positive: boolean }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-black"><Icon className={positive ? 'h-4 w-4 text-black' : 'h-4 w-4 text-black'} />{label}</div>
      <p className={`text-sm font-semibold ${positive ? 'text-black' : 'text-black'}`}>{value}</p>
    </div>
  )
}



