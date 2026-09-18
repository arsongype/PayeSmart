import { useState } from 'react'
import { Bell, Globe, Lock, Save, WalletCards } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type Settings = { emailNotifications: boolean; fraudAlerts: boolean; language: string; currency: string }
const defaultSettings: Settings = { emailNotifications: true, fraudAlerts: true, language: 'Français', currency: 'EUR' }

export default function SettingsPage() {
  const { user } = useAuth()
  const settingsKey = `paysmart-settings-${user?.id ?? 'guest'}`
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem(`paysmart-settings-${user?.id ?? 'guest'}`)
    return stored ? { ...defaultSettings, ...JSON.parse(stored) as Partial<Settings> } : defaultSettings
  })
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings({ ...settings, [key]: value })
  const save = () => {
    localStorage.setItem(settingsKey, JSON.stringify(settings))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-dark-50">Paramètres</h1>
        <p className="mt-1 text-dark-400">Gérez vos préférences d’utilisation et de sécurité.</p>
      </header>

      <section className="rounded-xl border border-dark-700 bg-dark-800 p-6">
        <div className="mb-5 flex items-center gap-3"><Bell size={20} className="text-primary-400" /><h2 className="font-semibold text-dark-50">Notifications</h2></div>
        <div className="space-y-4">
          {[
            ['emailNotifications', 'Notifications par email', 'Recevoir les confirmations et mises à jour du compte.'],
            ['fraudAlerts', 'Alertes de sécurité', 'Être informé immédiatement en cas d’activité suspecte.'],
          ].map(([key, title, description]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-dark-700/70 pb-4 last:border-0 last:pb-0">
              <span><span className="block text-sm font-medium text-dark-100">{title}</span><span className="mt-1 block text-xs text-dark-500">{description}</span></span>
              <input type="checkbox" checked={settings[key as 'emailNotifications' | 'fraudAlerts']} onChange={(event) => update(key as 'emailNotifications' | 'fraudAlerts', event.target.checked)} className="h-4 w-4 accent-primary-500" />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="rounded-xl border border-dark-700 bg-dark-800 p-5"><span className="flex items-center gap-2 text-sm font-medium text-dark-100"><Globe size={17} className="text-primary-400" /> Langue</span><select value={settings.language} onChange={(event) => update('language', event.target.value)} className="mt-4 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 py-2 text-sm text-dark-100"><option>Français</option><option>English</option></select></label>
        <label className="rounded-xl border border-dark-700 bg-dark-800 p-5"><span className="flex items-center gap-2 text-sm font-medium text-dark-100"><WalletCards size={17} className="text-primary-400" /> Devise d’affichage</span><select value={settings.currency} onChange={(event) => update('currency', event.target.value)} className="mt-4 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 py-2 text-sm text-dark-100"><option>EUR</option><option>USD</option><option>XOF</option></select></label>
      </section>

      <section className="rounded-xl border border-dark-700 bg-dark-800 p-6"><div className="flex items-center gap-3"><Lock size={20} className="text-amber-400" /><div><h2 className="font-semibold text-dark-50">Sécurité du compte</h2><p className="mt-1 text-sm text-dark-500">La vérification en deux étapes et le changement de mot de passe sont disponibles depuis les flux de sécurité.</p></div></div></section>
      <div className="flex items-center justify-end gap-3"><span className="text-sm text-emerald-400">{saved ? 'Préférences enregistrées.' : ''}</span><button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500"><Save size={16} /> Enregistrer les paramètres</button></div>
    </div>
  )
}