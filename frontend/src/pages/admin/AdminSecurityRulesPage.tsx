import { useEffect, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
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
  monitoredCountries: number
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
  monitoredCountries: 3,
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
  settings.monitoredCountries = numberValue(fraudConditions.monitoredCountries, defaults.monitoredCountries)
  return settings
}

export default function AdminSecurityRulesPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(defaults)
  const [rules, setRules] = useState<SecurityRule[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const [loadedRules, loadedLogs] = await Promise.all([adminService.getSecurityRules(), adminService.getAuditLogs()])
      setRules(loadedRules)
      setSettings(getSettings(loadedRules))
      setAuditLogs(loadedLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSaved(false)
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      const transaction = rules.find((rule) => rule.ruleType === 'TRANSACTION_LIMIT' && rule.isActive)
      const fraud = rules.find((rule) => rule.ruleType === 'AI_THRESHOLDS' && rule.isActive)
      const transactionPayload = {
        ruleName: 'Règles de transaction',
        ruleType: 'TRANSACTION_LIMIT',
        conditions: {
          transactionLimit: settings.transactionLimit,
          dailyLimit: settings.dailyLimit,
          monthlyLimit: settings.monthlyLimit,
          paymentAttempts: settings.paymentAttempts,
          loginAttempts: settings.loginAttempts,
          sessionMinutes: settings.sessionMinutes,
        },
        actions: { twoFactorEnabled: settings.twoFactorEnabled },
        isActive: true,
        priority: 100,
      }
      const fraudPayload = {
        ruleName: 'Seuils du modèle IA',
        ruleType: 'AI_THRESHOLDS',
        conditions: {
          lowRiskThreshold: settings.lowRiskThreshold,
          mediumRiskThreshold: settings.mediumRiskThreshold,
          monitoredCountries: settings.monitoredCountries,
        },
        actions: { mediumRiskAction: 'OTP', highRiskAction: 'BLOCK' },
        isActive: true,
        priority: 90,
      }
      if (transaction) await adminService.updateSecurityRule(transaction.id, transactionPayload)
      else await adminService.createSecurityRule(transactionPayload)
      if (fraud) await adminService.updateSecurityRule(fraud.id, fraudPayload)
      else await adminService.createSecurityRule(fraudPayload)
      await load()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer les modifications')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <FullPageLoader />

  const field = (label: string, key: keyof SecuritySettings, suffix: string) => (
    <label className="flex items-center justify-between gap-4 text-sm text-[#3e3a36]">
      <span>{label}</span>
      <span className="flex items-center gap-1 font-semibold text-[#087b80]">
        <input type="number" value={settings[key] as number} onChange={(event) => update(key, Number(event.target.value))} className="w-28 border-0 bg-transparent text-right font-semibold text-[#087b80] outline-none" />
        <span>{suffix}</span>
      </span>
    </label>
  )

  return (
    <div className="min-h-screen bg-[#f7f6f2] p-4 text-[#3e3a36] lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#d7f0f0] p-2 text-[#087b80]"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold">{t('securityRules')}</h1>
            <p className="text-sm text-[#827d77]">{t('securityRulesDescription')}</p>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {saved && <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">Modifications enregistrées.</div>}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dedbd4] bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold">[SEC] Règles de transaction</h2>
            <div className="space-y-5">
              {field('Plafond par transaction', 'transactionLimit', 'MGA')}
              {field('Limite journalière', 'dailyLimit', 'MGA')}
              {field('Limite mensuelle', 'monthlyLimit', 'MGA')}
              {field('Max tentatives de paiement', 'paymentAttempts', '/ heure')}
              {field('Max tentatives de connexion', 'loginAttempts', '')}
              {field('Durée de session', 'sessionMinutes', 'minutes')}
              <div className="flex items-center justify-between text-sm"><span>Authentification à deux facteurs</span><button type="button" role="switch" aria-checked={settings.twoFactorEnabled} onClick={() => update('twoFactorEnabled', !settings.twoFactorEnabled)} className={`relative h-6 w-12 rounded-full transition ${settings.twoFactorEnabled ? 'bg-[#398d2f]' : 'bg-gray-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${settings.twoFactorEnabled ? 'left-7' : 'left-1'}`} /></button></div>
            </div>
          </section>

          <section className="rounded-xl border border-[#dedbd4] bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold">[IA] Seuils du modèle IA</h2>
            <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-lg text-center text-sm font-semibold"><div className="bg-[#d4edc4] p-2 text-[#4d8734]">Faible</div><div className="bg-[#fbe0cc] p-2 text-[#a55b32]">Moyen</div><div className="bg-[#f1cedc] p-2 text-[#a64278]">Élevé</div></div>
            <div className="mb-5 flex justify-between text-xs text-[#827d77]"><span>0.0</span><span>0.3</span><span>0.7</span><span>1.0</span></div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between"><span>Seuil risque faible → auto</span><strong className="text-[#087b80]">&lt; <input className="w-12 text-right font-semibold text-[#087b80] outline-none" type="number" step="0.01" value={settings.lowRiskThreshold} onChange={(e) => update('lowRiskThreshold', Number(e.target.value))} /></strong></div>
              <div className="flex justify-between"><span>Seuil risque moyen → OTP</span><strong className="text-[#087b80]">{settings.lowRiskThreshold.toFixed(2)} - {settings.mediumRiskThreshold.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Seuil risque élevé → blocage</span><strong className="text-[#087b80]">&gt; {settings.mediumRiskThreshold.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Pays surveillés</span><strong className="text-[#087b80]"><input className="w-10 text-right font-semibold text-[#087b80] outline-none" type="number" value={settings.monitoredCountries} onChange={(e) => update('monitoredCountries', Number(e.target.value))} /> pays</strong></div>
            </div>
          </section>
        </div>

        <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-[#087b80] px-4 py-2 font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</button>

        <section className="rounded-xl border border-[#dedbd4] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Journal d’audit</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-162.5 text-left text-sm"><thead className="text-xs uppercase text-[#827d77]"><tr><th className="p-3">DATE/HEURE</th><th className="p-3">UTILISATEUR</th><th className="p-3">ACTION</th><th className="p-3">DÉTAILS</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id} className="border-t border-[#dedbd4]"><td className="p-3">{new Date(log.createdAt).toLocaleString('fr-FR')}</td><td className="p-3">{log.user?.email ?? 'Système'}</td><td className="p-3">{log.action ?? `${log.method} ${log.path}`}</td><td className="p-3">HTTP {log.statusCode} · {log.path}</td></tr>)}</tbody></table>{auditLogs.length === 0 && <p className="p-4 text-sm text-[#827d77]">Aucune activité enregistrée.</p>}</div>
        </section>
      </div>
    </div>
  )
}
