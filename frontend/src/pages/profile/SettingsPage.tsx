import { useState, useEffect } from 'react'
import { Bell, Globe, Lock, Save, WalletCards, Shield } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../utils/i18n'
import { authService } from '../../services/auth.service'
import { Button } from '../../components/common/Button'

export default function SettingsPage() {
  const { settings, update, save } = useSettings()
  const { t } = useTranslation()
  const [saved, setSaved] = useState(false)
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ isTwoFactorEnabled: boolean } | null>(null)
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null)
  const [twoFactorOtpauthUrl, setTwoFactorOtpauthUrl] = useState<string | null>(null)

  const loadStatus = async () => {
    try {
      const data = await authService.getTwoFactorStatus()
      setTwoFactorStatus(data)
    } catch {
      setTwoFactorStatus(null)
    }
  }

  useEffect(() => {
    save()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }, [settings, save])

  useEffect(() => {
    loadStatus()
  }, [save])

  const startEnableTwoFactor = async () => {
    setTwoFactorLoading(true)
    setTwoFactorMessage(null)
    setTwoFactorCode('')
    setTwoFactorSecret(null)
    setTwoFactorOtpauthUrl(null)
    try {
      const data = await authService.setupTwoFactor()
      setTwoFactorSecret(data.secret)
      setTwoFactorOtpauthUrl(data.otpauthUrl)
    } catch (err) {
      setTwoFactorMessage(err instanceof Error ? err.message : t('error'))
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const confirmEnableTwoFactor = async (event: React.FormEvent) => {
    event.preventDefault()
    setTwoFactorLoading(true)
    setTwoFactorMessage(null)
    try {
      await authService.enableTwoFactor({ code: twoFactorCode })
      setTwoFactorMessage(t('twoFactorEnabled'))
      await loadStatus()
      setTwoFactorSecret(null)
      setTwoFactorCode('')
    } catch (err) {
      setTwoFactorMessage(err instanceof Error ? err.message : t('error'))
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const toggleTwoFactor = async () => {
    if (twoFactorStatus?.isTwoFactorEnabled) {
      setTwoFactorLoading(true)
      setTwoFactorMessage(null)
      setTwoFactorCode('')
      setTwoFactorSecret(null)
      try {
        await authService.disableTwoFactor({ code: twoFactorCode })
        setTwoFactorMessage(t('twoFactorDisabled'))
        await loadStatus()
      } catch (err) {
        setTwoFactorMessage(err instanceof Error ? err.message : t('error'))
      } finally {
        setTwoFactorLoading(false)
      }
    } else {
      await startEnableTwoFactor()
    }
  }

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
            { key: 'emailNotifications' as const, title: t('emailNotifications'), description: t('receiveUpdates') },
            { key: 'fraudAlerts' as const, title: t('fraudAlertsLabel'), description: t('immediateAlert') },
          ].map(({ key, title, description }) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300">
              <span>
                <span className="block text-base font-medium text-black">{title}</span>
                 <span className="mt-1 block text-sm text-black">{description}</span>
               </span>
              <input type="checkbox" checked={settings[key]} onChange={(event) => update(key, event.target.checked)} className="h-5 w-5 accent-primary-500" />
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
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-2xl bg-amber-500/10 p-2.5 text-black">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black">{t('accountSecurity')}</h2>
             <p className="mt-1 text-base text-black">{t('securityVerificationInfo')}</p>
          </div>
        </div>

        {twoFactorMessage && (
          <div className={`rounded-2xl border p-4 text-base mb-4 ${twoFactorMessage === '2FA activé' || twoFactorMessage === '2FA désactivé' ? 'bg-emerald-500/10 border-emerald-500/50 text-black' : 'bg-red-500/10 border-red-500/50 text-black'}`}>
            {twoFactorMessage}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-black" />
              <div>
                <p className="text-base font-medium text-black">{t('twoFactorAuth')}</p>
                <p className="text-sm text-black opacity-80">
                  {twoFactorStatus?.isTwoFactorEnabled ? t('twoFactorActive') : t('twoFactorInactive')}
                </p>
              </div>
            </div>
            {!twoFactorStatus?.isTwoFactorEnabled && !twoFactorSecret ? (
              <Button variant="outline" onClick={startEnableTwoFactor} disabled={twoFactorLoading} size="sm">
                {t('enableTwoFactor')}
              </Button>
            ) : null}
          </div>

          {twoFactorSecret && !twoFactorStatus?.isTwoFactorEnabled ? (
            <form onSubmit={confirmEnableTwoFactor} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-black mb-1.5">{t('scanQrCode')}</label>
                <div className="bg-white rounded-xl border border-gray-200 p-2 flex justify-center">
                  {twoFactorOtpauthUrl ? (
                    <QRCodeSVG value={twoFactorOtpauthUrl} size={160} />
                  ) : (
                    <Shield size={48} className="text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-black opacity-80 mt-1.5">{t('scanQrDescription')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1.5">{t('otpCode')}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-black outline-none focus:border-primary-500 text-center tracking-[0.375rem] font-mono"
                    placeholder="_ _ _ _ _ _"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  size="sm"
                  disabled={twoFactorLoading || twoFactorCode.length < 6}
                  isLoading={twoFactorLoading}
                >
                  {t('enableTwoFactor')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={() => { setTwoFactorSecret(null); setTwoFactorOtpauthUrl(null); setTwoFactorCode('') }}
                  disabled={twoFactorLoading}
                >
                  {t('cancel')}
                </Button>
              </div>
            </form>
          ) : null}

          {twoFactorStatus?.isTwoFactorEnabled ? (
            <form onSubmit={toggleTwoFactor} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-black mb-1.5">{t('otpCode')}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-black outline-none focus:border-primary-500 text-center tracking-[0.375rem] font-mono"
                    placeholder="_ _ _ _ _ _"
                  />
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={twoFactorLoading || twoFactorCode.length < 6}
                isLoading={twoFactorLoading}
              >
                {t('disableTwoFactor')}
              </Button>
            </form>
          ) : null}
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
