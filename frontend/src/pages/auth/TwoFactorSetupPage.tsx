import { useState, useEffect } from 'react'
import { Shield, QrCode, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { authService } from '../../services/auth.service'
import { useTranslation } from '../../utils/i18n'
import { Button } from '../../components/common/Button'

export default function TwoFactorSetupPage() {
  const { t } = useTranslation()
  const [secret, setSecret] = useState<string | null>(null)
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await authService.getTwoFactorStatus()
        setIsEnabled(data.isTwoFactorEnabled)
      } catch {
        setIsEnabled(false)
      }
    }
    checkStatus()
  }, [])

  const generateSecret = async () => {
    setStatus('loading')
    setMessage(null)
    try {
      const data = await authService.setupTwoFactor()
      setSecret(data.secret)
      setOtpauthUrl(data.otpauthUrl)
      setStatus('idle')
      setCode('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : t('errorGeneratingSecret'))
    }
  }

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length !== 6) return

    setStatus('loading')
    setMessage(null)

    try {
      await authService.enableTwoFactor({ code })
      setStatus('success')
      setMessage(t('twoFactorEnabled'))
      setIsEnabled(true)
      setSecret(null)
      setOtpauthUrl(null)
      setCode('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : t('invalid2faCode'))
    }
  }

  const disable = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length !== 6) return

    setStatus('loading')
    setMessage(null)

    try {
      await authService.disableTwoFactor({ code })
      setStatus('success')
      setMessage(t('twoFactorDisabled'))
      setIsEnabled(false)
      setSecret(null)
      setOtpauthUrl(null)
      setCode('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : t('invalid2faCode'))
    }
  }

  const resetAndEnable = () => {
    setSecret(null)
    setOtpauthUrl(null)
    setCode('')
    setStatus('idle')
    setMessage(null)
  }

  const renderOtpInput = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    disabled: boolean
  ) => (
    <div>
      <label className="block text-xs font-medium text-black mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-black outline-none focus:border-primary-500 text-center tracking-[0.375rem] font-mono"
          placeholder="_ _ _ _ _ _"
          disabled={disabled}
        />
        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )

  return (
    <div className="page-enter stagger-1 w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-primary-500/10 text-black flex items-center justify-center">
          <Shield size={24} />
        </div>
        <h1 className="text-2xl font-bold text-black tracking-tight">{t('twoFactorAuth')}</h1>
        <p className="text-xs text-black mt-1">{t('twoFactorDescription')}</p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border p-3 text-xs animate-fade-in ${
            status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-black'
              : 'bg-rose-500/10 border-rose-500/30 text-black'
          }`}
        >
          {message}
        </div>
      )}

      {!isEnabled ? (
        <div className="app-surface rounded-2xl p-6 shadow-lg shadow-black/5">
          {!secret ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary-500/10 flex items-center justify-center">
                <QrCode size={32} className="text-primary-500" />
              </div>
              <p className="text-sm text-black">
                Activez la vérification en deux étapes pour sécuriser votre compte avec votre application d'authentification.
              </p>
              <Button
                onClick={generateSecret}
                disabled={status === 'loading'}
                className="w-full h-11 rounded-xl text-sm font-semibold"
                leftIcon={<QrCode size={16} />}
              >
                {status === 'loading' ? 'Génération...' : 'Configurer la 2FA'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                  <Check size={20} className="text-emerald-500" />
                </div>
                <h2 className="text-sm font-semibold text-black">{t('scanQrCode')}</h2>
                <p className="text-xs text-black mt-0.5 opacity-80">{t('scanQrDescription')}</p>
              </div>

              <div className="flex justify-center bg-white rounded-xl border border-gray-200 p-3">
                {otpauthUrl ? (
                  <QRCodeSVG value={otpauthUrl} size={176} />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-gray-400">
                    <QrCode size={48} />
                  </div>
                )}
              </div>

              {renderOtpInput(t('otpCode'), code, setCode, status === 'loading')}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  onClick={confirm}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold"
                  isLoading={status === 'loading'}
                  disabled={code.length !== 6 || status === 'loading'}
                >
                  {t('enableTwoFactor')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetAndEnable}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold"
                  disabled={status === 'loading'}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="app-surface rounded-2xl p-6 shadow-lg shadow-black/5">
          <div className="text-center mb-4">
            <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield size={20} className="text-emerald-500" />
            </div>
            <h2 className="text-sm font-semibold text-black">{t('twoFactorActive')}</h2>
            <p className="text-xs text-black opacity-80 mt-0.5">
              Entrez un code de votre application pour désactiver
            </p>
          </div>

          {renderOtpInput(t('otpCode'), code, setCode, status === 'loading')}

          <form onSubmit={disable} className="mt-4">
            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-semibold"
              isLoading={status === 'loading'}
              disabled={code.length !== 6 || status === 'loading'}
            >
              {t('disableTwoFactor')}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
