import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { LoginFormData } from '../../utils/validators'
import { loginSchema } from '../../utils/validators'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../utils/i18n'
import { authService } from '../../services/auth.service'
import logo from '../../assets/Logo.png'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, verifyTwoFactor, twoFactorRequired, twoFactorEmail } = useAuth()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'error' | 'update' | 'delete'>('error')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [deletionPending, setDeletionPending] = useState(false)
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({})

  const validate = (): boolean => {
    try {
      loginSchema.parse(formData)
      setErrors({})
      return true
    } catch (err) {
      if (err instanceof Error && err.message) {
        const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {}
        try {
          const parsed = JSON.parse(err.message)
          Object.entries(parsed).forEach(([key, val]) => {
            const issue = Array.isArray(val) ? val[0] : val
            fieldErrors[key as keyof LoginFormData] =
              typeof issue === 'string' ? issue : String(issue)
          })
        } catch {
          setError(t('validationError'))
        }
        setErrors(fieldErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setFeedbackType('error')

    if (!validate()) return

    setIsLoading(true)

    try {
      await login(formData)
      onSuccess?.()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('loginFailed')
      if (errMsg === 'ACCOUNT_DELETION_PENDING') {
        setDeletionPending(true)
        setFeedbackType('delete')
        setError(t('accountDeletionPending'))
      } else if (errMsg === 'ACCOUNT_DELETION_EXPIRED') {
        setFeedbackType('delete')
        setError(t('accountDeletionExpired'))
      } else if (errMsg !== '2FA_REQUIRED') {
        setError(errMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleTwoFactorSubmit = async () => {
    if (twoFactorCode.length !== 6) return

    setIsLoading(true)
    setError(null)
    setFeedbackType('error')

    try {
      await verifyTwoFactor(twoFactorCode)
      onSuccess?.()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('invalid2faCode')
      if (errMsg === 'ACCOUNT_DELETION_PENDING') {
        setDeletionPending(true)
        setFeedbackType('delete')
        setError(t('accountDeletionPending'))
      } else if (errMsg === 'ACCOUNT_DELETION_EXPIRED') {
        setFeedbackType('delete')
        setError(t('accountDeletionExpired'))
      } else {
        setError(errMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreAccount = async () => {
    setIsLoading(true)
    setError(null)
    setFeedbackType('update')
    try {
      await authService.cancelAccountDeletion({
        ...formData,
        otpCode: twoFactorRequired ? twoFactorCode : undefined,
      })
      setDeletionPending(false)
      setTwoFactorCode('')
      setError(t('accountDeletionRestored'))
      try {
        await login(formData)
        onSuccess?.()
      } catch (err) {
        if (!(err instanceof Error) || err.message !== '2FA_REQUIRED') throw err
        setError(t('accountDeletionRestored'))
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('unknownError')
      setFeedbackType(errMsg === 'ACCOUNT_DELETION_EXPIRED' ? 'delete' : 'error')
      setError(errMsg === 'ACCOUNT_DELETION_EXPIRED' ? t('accountDeletionExpired') : errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto">
        <div className="text-center">
          <img src={logo} alt={t('paysmart')} className="mx-auto mb-3 h-auto w-36 rounded-lg bg-white px-3 py-1 object-contain" />
          <h1 className="text-xl font-bold text-black tracking-tight">Connexion</h1>
          <p className="text-xs text-black">Content de vous revoir !</p>
        </div>

        {error && (
          <div role={feedbackType === 'update' ? 'status' : 'alert'} className={`animate-fade-in rounded-lg border p-2.5 text-xs ${feedbackType === 'update' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-red-300 bg-red-50 text-red-800'}`}>
            {error}
          </div>
        )}

        {twoFactorRequired ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-primary-500" />
              </div>
              <h2 className="text-sm font-semibold text-black">{t('twoFactorAuthRequired')}</h2>
              <p className="text-xs text-black opacity-80 mt-0.5 mb-3">{t('twoFactorAuthRequiredDesc')}</p>
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-12 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-black outline-none focus:border-primary-500 text-center tracking-[0.375rem] font-mono placeholder:text-gray-400"
                placeholder="_ _ _ _ _ _"
              />
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <p className="text-xs text-black text-center opacity-80">
              {t('twoFactorAuthHint', { email: twoFactorEmail })}
            </p>

            <Button
              type="button"
              onClick={handleTwoFactorSubmit}
              className="w-full h-11 rounded-xl text-sm font-semibold"
              isLoading={isLoading}
            >
              {t('verifyAndLogin')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                className="h-10 rounded-lg pl-10 text-sm"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                className="h-10 rounded-lg pl-10 pr-10 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-black">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300" />
                Se souvenir de moi
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg text-sm font-semibold"
              isLoading={isLoading}
            >
              Se connecter
            </Button>
          </div>
        )}

        {!twoFactorRequired && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-black">ou continuer avec</span>
              </div>
            </div>

            <p className="text-center text-xs text-black">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-800 transition-colors">
                S'inscrire
              </Link>
            </p>
          </>
        )}

        {deletionPending && (
          <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3">
            <p className="text-xs text-black">{t('accountDeletionRecoveryHint')}</p>
            <Button
              type="button"
              onClick={handleRestoreAccount}
              className="w-full h-10 rounded-lg text-sm font-semibold"
              isLoading={isLoading}
              disabled={twoFactorRequired && twoFactorCode.length !== 6}
            >
              {t('restoreAccount')}
            </Button>
          </div>
        )}
      </form>
  )
}
