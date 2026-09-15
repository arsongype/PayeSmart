import { AlertTriangle, CheckCircle2, Eye, FileSearch, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from './Button'

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
  onRecalculate?: () => void
  recalculating?: boolean
}

const readableLabel = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function AnalysisResult({ analysis, onRecalculate, recalculating = false }: AnalysisResultProps) {
  if (!analysis) {
    return <p className="text-sm text-dark-500">Analyse non disponible pour ce document.</p>
  }

  const confidence = analysis.confidenceScore ?? analysis.confidence_score ?? 0
  const extractedData = analysis.extractedData ?? analysis.extracted_data ?? {}
  const fraudIndicators = analysis.fraudIndicators ?? analysis.fraud_indicators ?? []
  const trustImpact = analysis.trustScoreImpact ?? analysis.trust_score_impact ?? 0
  const riskScore = analysis.riskScore ?? analysis.risk_score
  const riskLevel = analysis.riskLevel ?? analysis.risk_level
  const isValid = analysis.is_valid ?? false
  const confidencePercent = Math.round(confidence * 100)

  return (
    <div className="mt-4 border-t border-dark-700 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-dark-100">
          <FileSearch className="h-4 w-4 text-primary-400" /> Résultat de l'analyse automatique
        </h3>
        {onRecalculate && (
          <Button type="button" size="sm" variant="outline" onClick={onRecalculate} disabled={recalculating}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalcul...' : 'Recalculer le Trust Score'}
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={isValid ? ShieldCheck : ShieldAlert} label="Validité" value={isValid ? 'Valide' : 'À vérifier'} positive={isValid} />
        <Metric icon={Eye} label="Lisibilité / confiance" value={`${confidencePercent}%`} positive={confidencePercent >= 70} />
        <Metric icon={ShieldCheck} label="Impact Trust Score" value={`${trustImpact >= 0 ? '+' : ''}${Math.round(trustImpact)} pts`} positive={trustImpact >= 0} />
        <Metric icon={AlertTriangle} label="Risque entreprise" value={riskScore === undefined ? 'Non calculé' : `${riskLevel ?? 'N/A'} (${Math.round(riskScore)}/100)`} positive={riskScore !== undefined && riskScore < 30} />
        <Metric icon={fraudIndicators.length ? AlertTriangle : CheckCircle2} label="Falsification" value={fraudIndicators.length ? `${fraudIndicators.length} alerte(s)` : 'Aucune alerte'} positive={!fraudIndicators.length} />
      </div>

      {Object.keys(extractedData).length > 0 && (
        <div className="mt-3 rounded-lg border border-dark-700 bg-dark-900/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dark-400">Données extraites par OCR</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="flex min-w-0 justify-between gap-3 text-sm">
                <span className="text-dark-400">{readableLabel(key)}</span>
                <span className="truncate text-right font-medium text-dark-100">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fraudIndicators.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Alertes de contrôle</p>
          <ul className="list-inside list-disc text-sm text-amber-200">
            {fraudIndicators.map((indicator) => <li key={indicator}>{readableLabel(indicator)}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value, positive }: { icon: typeof CheckCircle2; label: string; value: string; positive: boolean }) {
  return (
    <div className="rounded-lg border border-dark-700 bg-dark-900/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-dark-400"><Icon className={positive ? 'h-4 w-4 text-emerald-400' : 'h-4 w-4 text-amber-400'} />{label}</div>
      <p className={`text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-amber-300'}`}>{value}</p>
    </div>
  )
}
