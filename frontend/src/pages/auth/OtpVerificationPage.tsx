import { useState } from 'react'
import { Mail, CheckCircle } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { useTranslation } from '../../utils/i18n'
import { Button } from '../../components/common/Button'

export default function OtpVerificationPage() {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('loading')
    setMessage(null)
    try {
      await authService.verifyOtp({ email: '', otp: code })
      setStatus('success')
      setMessage(t('otpVerified'))
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : t('invalidOtp'))
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-4">
        <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-primary-500/10 text-black flex items-center justify-center">
          <Mail size={20} />
        </div>
        <h1 className="text-xl font-bold text-black">{t('otpVerification')}</h1>
        <p className="text-xs text-black mt-1">{t('enterOtpCode')}</p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-gray-300 bg-white p-5 shadow-lg shadow-black/10 space-y-3">
        {message && (
          <div className={`rounded-xl border p-3 text-xs ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-black' : 'bg-red-500/10 border-red-500/50 text-black'}`}>
            <div className="flex items-center gap-2">
              {status === 'success' && <CheckCircle size={16} />}
              {message}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-black mb-1">{t('otpCode')}</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-black outline-none focus:border-primary-500 text-center tracking-widest"
            placeholder="123456"
          />
        </div>
        <Button type="submit" className="w-full h-10 rounded-lg text-sm font-semibold" disabled={status === 'loading' || code.length < 6}>
          {status === 'loading' ? t('verifying') : t('verifyOtp')}
        </Button>
      </form>
    </div>
  )
}
