import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { LoginFormData } from '../../utils/validators'
import { loginSchema } from '../../utils/validators'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../utils/i18n'
import logo from '../../assets/Logo.png'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    if (!validate()) return

    setIsLoading(true)

    try {
      await login(formData)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-sm mx-auto animate-slide-up">
      <div className="space-y-2 text-center">
        <img src={logo} alt={t('paysmart')} className="mx-auto mb-2 h-auto w-40 object-contain" />
        <h1 className="text-2xl font-bold text-black tracking-tight">{t('login')}</h1>
        <p className="text-xs text-black">{t('welcomeBack')}</p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-black animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Input
            label={t('emailLabel')}
            type="email"
            placeholder={t('emailPlaceholder')}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            className="h-11 rounded-xl"
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="relative">
            <Input
              label={t('passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              className="h-11 rounded-xl pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-black transition-colors"
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="text-right pt-1">
            <Link
              to="/forgot-password"
              className="text-xs text-black hover:text-black transition-colors font-medium"
            >
              {t('forgotPasswordLink')}
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/35 active:scale-[0.98]"
          isLoading={isLoading}
        >
          {t('loginButton')}
        </Button>
      </div>

      <div className="text-center pt-2">
         <span className="text-xs text-black">{t('noAccountQuestion')} </span>
        <Link
          to="/register"
          className="text-xs font-semibold text-black hover:text-black transition-colors ml-1"
        >
          {t('createAccountLink')}
        </Link>
      </div>
    </form>
  )
}



