import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Input } from '../../components/common/Input'
import { PasswordInput } from '../../components/common/PasswordInput'
import { Button } from '../../components/common/Button'
import { resetPasswordSchema } from '../../utils/validators'
import { useTranslation } from '../../utils/i18n'
import { apiClient } from '../../config/axios.config'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const result = resetPasswordSchema.safeParse({ token, password, confirmPassword })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)
    try {
      await apiClient.post('/auth/reset-password', { token, password })
      setMessage(t('passwordResetSuccess'))
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetImpossible'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-4">
        <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-primary-500/10 text-black flex items-center justify-center">
          <Lock size={20} />
        </div>
        <h1 className="text-xl font-bold text-black">{t('resetPassword')}</h1>
        <p className="text-xs text-black mt-1">{t('chooseNewPassword')}</p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 p-2.5 text-xs text-black">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-2.5 text-xs text-black">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label={t('tokenLabel')} value={token} readOnly className="bg-gray-50 h-10 rounded-lg text-xs" />

        <PasswordInput
          label={t('newPassword')}
          placeholder={t('passwordPlaceholder')}
          value={password}
          onChange={setPassword}
          className="text-xs"
          required
        />

        <PasswordInput
          label={t('confirmPassword')}
          placeholder={t('passwordPlaceholder')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          className="text-xs"
          required
        />

        <Button type="submit" className="w-full h-10 rounded-lg text-sm font-semibold" isLoading={isLoading}>
          {t('resetAction')}
        </Button>
      </form>

      <p className="text-center text-xs text-black mt-3">
        <Link to="/login" className="font-medium text-black hover:text-black transition-colors">
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  )
}
