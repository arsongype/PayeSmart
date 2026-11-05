import { useEffect, useState } from 'react'
import { Activity, BadgeCheck, BrainCircuit, ChevronLeft, ChevronRight, CircleAlert, Save, ShieldCheck } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { useTranslation } from '../../utils/i18n'
import { FullPageLoader } from '../../components/common/Loader'

interface SecurityRule {
  id: number
  ruleType: string
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  isActive: boolean
}

interface AuditLog {
  id: number
  method: string
  path: string
  action: string | null
  statusCode: number
  createdAt: string
  user: { email?: string; firstName?: string; lastName?: string } | null
}

interface AuditLogsPage {
  items: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function parseAuditLogsPage(response: unknown, requestedPage: number): AuditLogsPage {
  if (Array.isArray(response)) {
    const items = response.slice(0, 10) as AuditLog[]
    return { items, total: response.length, page: 1, limit: 10, totalPages: 1 }
  }

  if (
    typeof response === 'object'
    && response !== null
    && 'items' in response
    && Array.isArray(response.items)
  ) {
    const result = response as Partial<AuditLogsPage>
    const items = response.items as AuditLog[]
    const total = typeof result.total === 'number' && Number.isFinite(result.total) ? result.total : items.length
    const page = typeof result.page === 'number' && Number.isSafeInteger(result.page) && result.page > 0
      ? result.page
      : requestedPage
    const limit = typeof result.limit === 'number' && Number.isSafeInteger(result.limit) && result.limit > 0
      ? result.limit
      : 10
    const totalPages = typeof result.totalPages === 'number' && Number.isSafeInteger(result.totalPages) && result.totalPages >= 0
      ? result.totalPages
      : Math.ceil(total / limit)
    return { items, total, page, limit, totalPages }
  }

  throw new Error('Format inattendu reçu pour le journal d’audit')
}

interface SecuritySettings {
  transactionLimit: number
  dailyLimit: number
  monthlyLimit: number
  paymentAttempts: number
  loginAttempts: number
  sessionMinutes: number
  twoFactorEnabled: boolean
  lowRiskThreshold: number
  mediumRiskThreshold: number
  monitoredCountryCodes: string
}

const defaults: SecuritySettings = {
  transactionLimit: 500000,
  dailyLimit: 5000,
  monthlyLimit: 50000,
  paymentAttempts: 5,
  loginAttempts: 3,
  sessionMinutes: 30,
  twoFactorEnabled: true,
  lowRiskThreshold: 0.3,
  mediumRiskThreshold: 0.7,
  monitoredCountryCodes: '',
}

function numberValue(value: unknown, fallback: number) {
  const numericValue = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function getSettings(rules: SecurityRule[]) {
  const settings = { ...defaults }
  const transaction = rules.find((rule) => rule.ruleType === 'TRANSACTION_LIMIT' && rule.isActive)
  const fraud = rules.find((rule) => rule.ruleType === 'AI_THRESHOLDS' && rule.isActive)
  const conditions = transaction?.conditions ?? {}
  const fraudConditions = fraud?.conditions ?? {}
  settings.transactionLimit = numberValue(conditions.transactionLimit, defaults.transactionLimit)
  settings.dailyLimit = numberValue(conditions.dailyLimit, defaults.dailyLimit)
  settings.monthlyLimit = numberValue(conditions.monthlyLimit, defaults.monthlyLimit)
  settings.paymentAttempts = numberValue(conditions.paymentAttempts, defaults.paymentAttempts)
  settings.loginAttempts = numberValue(conditions.loginAttempts, defaults.loginAttempts)
  settings.sessionMinutes = numberValue(conditions.sessionMinutes, defaults.sessionMinutes)
  settings.twoFactorEnabled = typeof transaction?.actions.twoFactorEnabled === 'boolean' ? transaction.actions.twoFactorEnabled : defaults.twoFactorEnabled
  settings.lowRiskThreshold = numberValue(fraudConditions.lowRiskThreshold, defaults.lowRiskThreshold)
  settings.mediumRiskThreshold = numberValue(fraudConditions.mediumRiskThreshold, defaults.mediumRiskThreshold)
  settings.monitoredCountryCodes = Array.isArray(fraudConditions.monitoredCountryCodes)
    ? fraudConditions.monitoredCountryCodes.filter((country): country is string => typeof country === 'string').join(', ')
    : typeof fraudConditions.monitoredCountryCodes === 'string'
      ? fraudConditions.monitoredCountryCodes
      : defaults.monitoredCountryCodes
  return settings
}

function validateSettings(settings: SecuritySettings) {
  const positiveValues: Array<[string, number]> = [
    ['Plafond par transaction', settings.transactionLimit],
    ['Limite journalière', settings.dailyLimit],
    ['Limite mensuelle', settings.monthlyLimit],
  ]
  const positiveIntegers: Array<[string, number]> = [
    ['Max tentatives de paiement', settings.paymentAttempts],
    ['Max tentatives de connexion', settings.loginAttempts],
    ['Durée de session', settings.sessionMinutes],
  ]
  const invalidAmount = positiveValues.find(([, value]) => !Number.isFinite(value) || value <= 0)
  if (invalidAmount) return `${invalidAmount[0]} doit être supérieur à zéro.`
  const invalidInteger = positiveIntegers.find(([, value]) => !Number.isSafeInteger(value) || value <= 0)
  if (invalidInteger) return `${invalidInteger[0]} doit être un entier supérieur à zéro.`
  if (
    !Number.isFinite(settings.lowRiskThreshold)
    || !Number.isFinite(settings.mediumRiskThreshold)
    || settings.lowRiskThreshold < 0
    || settings.mediumRiskThreshold > 1
    || settings.lowRiskThreshold >= settings.mediumRiskThreshold
  ) {
    return 'Les seuils de risque doivent respecter 0 ≤ faible < moyen ≤ 1.'
  }
  const countryCodes = settings.monitoredCountryCodes.split(',').map((country) => country.trim())
  if (
    (settings.monitoredCountryCodes.trim() && countryCodes.some((country) => !country))
    || countryCodes.some((country) => country && !/^[A-Za-z]{2}$/.test(country))
    || new Set(countryCodes.map((country) => country.toUpperCase()).filter(Boolean)).size !== countryCodes.filter(Boolean).length
  ) {
    return 'Saisissez des codes pays ISO-2 distincts, séparés par des virgules (ex. MG, FR, US).'
  }
  return null
}

export default function AdminSecurityRulesPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(defaults)
  const [rules, setRules] = useState<SecurityRule[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rulesLoaded, setRulesLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const validationError = validateSettings(settings)

  const load = async (page = 1) => {
    try {
      setLoading(true)
      const [loadedRules, logsPage] = await Promise.all([
        adminService.getSecurityRules() as Promise<SecurityRule[]>,
        adminService.getAuditLogs(page),
      ])
      const parsedLogsPage = parseAuditLogsPage(logsPage, page)
      setRules(loadedRules)
      setRulesLoaded(true)
      setSettings(getSettings(loadedRules))
      setAuditLogs(parsedLogsPage.items)
      setAuditPage(parsedLogsPage.page)
      setAuditTotal(parsedLogsPage.total)
      setAuditTotalPages(Math.max(1, parsedLogsPage.totalPages))
    } finally {
      setLoading(false)
    }
  }

  const loadAuditPage = async (page: number) => {
    try {
      setAuditLoading(true)
      const result = parseAuditLogsPage(await adminService.getAuditLogs(page), page)
      setAuditLogs(result.items)
      setAuditPage(result.page)
      setAuditTotal(result.total)
      setAuditTotalPages(Math.max(1, result.totalPages))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le journal d’audit')
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    Promise.all([
      adminService.getSecurityRules() as Promise<SecurityRule[]>,
      adminService.getAuditLogs(1),
    ]).then(([loadedRules, logsResponse]) => {
      if (!mounted) return
      const logsPage = parseAuditLogsPage(logsResponse, 1)
      setRules(loadedRules)
      setRulesLoaded(true)
      setSettings(getSettings(loadedRules))
      setAuditLogs(logsPage.items)
      setAuditPage(logsPage.page)
      setAuditTotal(logsPage.total)
      setAuditTotalPages(Math.max(1, logsPage.totalPages))
    }).catch((err: unknown) => {
      if (mounted) setError(err instanceof Error ? err.message : 'Impossible de charger la configuration')
    }).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSaved(false)
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      setSaving(true)
      setError(null)
      const transaction = rules.find((rule) => rule.ruleType === 'TRANSACTION_LIMIT' && rule.isActive)
      const fraud = rules.find((rule) => rule.ruleType === 'AI_THRESHOLDS' && rule.isActive)
      const hasTransactionRule = rules.some((rule) => rule.ruleType === 'TRANSACTION_LIMIT')
      const hasFraudRule = rules.some((rule) => rule.ruleType === 'AI_THRESHOLDS')
      const transactionPayload = {
        ruleName: 'Règles de transaction',
        ruleType: 'TRANSACTION_LIMIT',
        conditions: {
          ...transaction?.conditions,
          transactionLimit: settings.transactionLimit,
          dailyLimit: settings.dailyLimit,
          monthlyLimit: settings.monthlyLimit,
          paymentAttempts: settings.paymentAttempts,
          loginAttempts: settings.loginAttempts,
          sessionMinutes: settings.sessionMinutes,
        },
        actions: { ...transaction?.actions, twoFactorEnabled: settings.twoFactorEnabled },
        isActive: true,
        priority: 100,
      }
      const fraudPayload = {
        ruleName: 'Seuils du modèle IA',
        ruleType: 'AI_THRESHOLDS',
        conditions: {
          ...fraud?.conditions,
          lowRiskThreshold: settings.lowRiskThreshold,
          mediumRiskThreshold: settings.mediumRiskThreshold,
          monitoredCountryCodes: settings.monitoredCountryCodes.split(',').map((country) => country.trim().toUpperCase()).filter(Boolean),
        },
        actions: { ...fraud?.actions, mediumRiskAction: 'OTP', highRiskAction: 'BLOCK' },
        isActive: true,
        priority: 90,
      }
      if (transaction) await adminService.updateSecurityRule(transaction.id, transactionPayload)
      else if (!hasTransactionRule) await adminService.createSecurityRule(transactionPayload)
      if (fraud) await adminService.updateSecurityRule(fraud.id, fraudPayload)
      else if (!hasFraudRule) await adminService.createSecurityRule(fraudPayload)
      await load(auditPage)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer les modifications')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <FullPageLoader />

  const field = (label: string, key: keyof SecuritySettings, suffix: string) => (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-teal-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10">
        <input
          type="number"
          min="1"
          step={['paymentAttempts', 'loginAttempts', 'sessionMinutes'].includes(key) ? '1' : '0.01'}
          value={settings[key] as number}
          onChange={(event) => update(key, Number(event.target.value))}
          className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-2.5 text-right font-semibold text-slate-900 outline-none"
        />
        <span className="px-3 text-xs font-semibold text-slate-500">{suffix}</span>
      </span>
    </label>
  )

  const activeRuleCount = rules.filter((rule) => rule.isActive).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40 p-4 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/70 p-6 text-slate-900 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-white p-3 text-emerald-700 shadow-sm"><ShieldCheck className="h-7 w-7" /></div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('securityRules')}</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">{t('securityRulesDescription')}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
              {activeRuleCount} règle{activeRuleCount === 1 ? '' : 's'} active{activeRuleCount === 1 ? '' : 's'}
            </div>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />{error}</div>}
        {saved && <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><BadgeCheck className="h-5 w-5 shrink-0" />Modifications enregistrées.</div>}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Activity className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-slate-900">Règles de transaction</h2>
                <p className="text-xs text-slate-500">Plafonds et contrôles d’accès aux paiements</p>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {field('Plafond par transaction', 'transactionLimit', 'MGA')}
              {field('Limite journalière', 'dailyLimit', 'MGA')}
              {field('Limite mensuelle', 'monthlyLimit', 'MGA')}
              {field('Max tentatives de paiement', 'paymentAttempts', '/ heure')}
              {field('Max tentatives de connexion', 'loginAttempts', '')}
              {field('Durée de session', 'sessionMinutes', 'minutes')}
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Authentification à deux facteurs</p>
                  <p className="mt-0.5 text-xs text-slate-500">{settings.twoFactorEnabled ? 'Demandée pour les opérations concernées' : 'Désactivée par la règle de transaction'}</p>
                </div>
                <button type="button" role="switch" aria-label="Authentification à deux facteurs" aria-checked={settings.twoFactorEnabled} onClick={() => update('twoFactorEnabled', !settings.twoFactorEnabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${settings.twoFactorEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><BrainCircuit className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-slate-900">Seuils du modèle IA</h2>
                <p className="text-xs text-slate-500">Ajustez la réponse selon le score de risque</p>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="rounded-xl bg-emerald-50 px-2 py-3 text-emerald-800">Faible · auto</div>
                <div className="rounded-xl bg-amber-50 px-2 py-3 text-amber-800">Moyen · OTP</div>
                <div className="rounded-xl bg-rose-50 px-2 py-3 text-rose-800">Élevé · blocage</div>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500">
                <span className="absolute -top-1 h-4 w-1 rounded bg-slate-900 shadow" style={{ left: `${settings.lowRiskThreshold * 100}%` }} />
                <span className="absolute -top-1 h-4 w-1 rounded bg-slate-900 shadow" style={{ left: `${settings.mediumRiskThreshold * 100}%` }} />
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
                  Seuil de risque faible
                  <span className="flex items-center gap-2 text-slate-500">&lt;
                    <input className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right font-semibold text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" min="0" max="1" step="0.01" type="number" value={settings.lowRiskThreshold} onChange={(event) => update('lowRiskThreshold', Number(event.target.value))} />
                  </span>
                </label>
                <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
                  Seuil de risque moyen
                  <span className="flex items-center gap-2 text-slate-500">{settings.lowRiskThreshold.toFixed(2)} –
                    <input className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right font-semibold text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" min="0" max="1" step="0.01" type="number" value={settings.mediumRiskThreshold} onChange={(event) => update('mediumRiskThreshold', Number(event.target.value))} />
                  </span>
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Codes pays surveillés <span className="font-normal text-slate-500">(ISO-2, séparés par des virgules)</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium uppercase text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" type="text" value={settings.monitoredCountryCodes} onChange={(event) => update('monitoredCountryCodes', event.target.value)} placeholder="MG, FR, US" autoCapitalize="characters" />
                </label>
              </div>
              {validationError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{validationError}</p>}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Les règles sont appliquées aux opérations dès leur enregistrement.</p>
          <button type="button" disabled={saving || !rulesLoaded || Boolean(validationError)} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white shadow-lg shadow-teal-700/15 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</button>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">Journal d’audit</h2>
              <p className="mt-0.5 text-xs text-slate-500">Historique des actions administratives</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{auditTotal} entrée{auditTotal === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto p-3 sm:p-5">
            <table className="w-full min-w-162.5 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-xl p-3">Date/heure</th><th className="p-3">Utilisateur</th><th className="p-3">Action</th><th className="rounded-r-xl p-3">Détails</th></tr></thead>
              <tbody>
                {auditLoading
                  ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">Chargement du journal...</td></tr>
                  : auditLogs.map((log) => <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="whitespace-nowrap p-3 text-slate-600">{new Date(log.createdAt).toLocaleString('fr-FR')}</td><td className="p-3 font-medium text-slate-800">{log.user?.email ?? 'Système'}</td><td className="p-3 text-slate-700">{log.action ?? `${log.method} ${log.path}`}</td><td className="p-3 text-slate-500">HTTP {log.statusCode} · {log.path}</td></tr>)}
              </tbody>
            </table>
            {!auditLoading && auditLogs.length === 0 && <p className="p-4 text-sm text-[#827d77]">Aucune activité enregistrée.</p>}
          </div>
          <nav className="flex items-center justify-center gap-3 border-t border-slate-100 px-5 py-4" aria-label="Pagination du journal d’audit">
            <button type="button" aria-label="Page précédente" onClick={() => void loadAuditPage(auditPage - 1)} disabled={auditLoading || auditPage <= 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Précédent</button>
            <span className="text-sm font-medium text-slate-500" aria-live="polite">Page {auditPage} sur {auditTotalPages}</span>
            <button type="button" aria-label="Page suivante" onClick={() => void loadAuditPage(auditPage + 1)} disabled={auditLoading || auditPage >= auditTotalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Suivant<ChevronRight className="h-4 w-4" /></button>
          </nav>
        </section>
      </div>
    </div>
  )
}
