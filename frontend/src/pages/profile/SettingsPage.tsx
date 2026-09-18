import { useState, useEffect } from 'react'
import { Bell, Globe, Lock, Save, WalletCards } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../utils/i18n'

export default function SettingsPage() {
  const { user } = useAuth()
  const { settings, update, save } = useSettings()
  const { t } = useTranslation()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    save()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }, [settings, save])

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black">{t('settings')}</h1>
         <p className="mt-1 text-black">{t('managePreferences')}</p>
      </div>

      <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
            <Bell size={20} />
          </div>
          <h2 className="text-xl font-semibold text-black">{t('notifications')}</h2>
        </div>
        <div className="space-y-1">
          {[
            ['emailNotifications', t('emailNotifications'), t('receiveUpdates')],
            ['fraudAlerts', t('fraudAlertsLabel'), t('immediateAlert')],
          ].map(([key, title, description]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300">
              <span>
                <span className="block text-base font-medium text-black">{title}</span>
                 <span className="mt-1 block text-sm text-black">{description}</span>
              </span>
              <input type="checkbox" checked={settings[key as 'emailNotifications' | 'fraudAlerts']} onChange={(event) => update(key as 'emailNotifications' | 'fraudAlerts', event.target.checked)} className="h-5 w-5 accent-primary-500" />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
          <span className="flex items-center gap-2 text-base font-medium text-black">
            <span className="rounded-xl bg-primary-500/10 p-1.5 text-black"><Globe size={17} /></span>
            {t('language')}
          </span>
          <select value={settings.language} onChange={(event) => update('language', event.target.value as 'fr' | 'en')} className="mt-4 w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base text-black outline-none focus:border-primary-500">
            <option value="fr">{t('french')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>
        <label className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
          <span className="flex items-center gap-2 text-base font-medium text-black">
            <span className="rounded-xl bg-primary-500/10 p-1.5 text-black"><WalletCards size={17} /></span>
            {t('displayCurrency')}
          </span>
          <select value={settings.currency} onChange={(event) => update('currency', event.target.value as 'EUR' | 'USD' | 'XOF' | 'MGA')} className="mt-4 w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base text-black outline-none focus:border-primary-500">
            <option value="EUR">{t('eur')}</option>
            <option value="USD">{t('usd')}</option>
            <option value="XOF">{t('xof')}</option>
            <option value="MGA">{t('mga')}</option>
          </select>
        </label>
      </section>

      <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-500/10 p-2.5 text-black">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black">{t('accountSecurity')}</h2>
             <p className="mt-1 text-base text-black">{t('securityVerificationInfo')}</p>
          </div>
        </div>
      </section>
      <div className="flex items-center justify-end gap-3">
        <span className="text-base text-black">{saved ? t('preferencesSaved') : ''}</span>
        <button type="button" onClick={save} className="flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-2.5 text-base font-medium text-black hover:bg-primary-500">
          <Save size={16} /> {t('saveSettings')}
        </button>
      </div>
    </div>
  )
}

