import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { PasswordInput } from '../../components/common/PasswordInput'
import { resetPasswordSchema } from '../../utils/validators'
import { useTranslation } from '../../utils/i18n'

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
      const response = await fetch('http://localhost:3000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (!response.ok) {
        throw new Error(t('resetImpossible'))
      }

      setMessage(t('passwordResetSuccess'))
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-2xl shadow-dark-950/50">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-black">{t('resetPassword')}</h1>
        <p className="mt-2 text-sm text-black">{t('chooseNewPassword')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-black">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-black">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('tokenLabel')} value={token} readOnly className="bg-gray-50" />

        <PasswordInput
          label={t('newPassword')}
          placeholder={t('passwordPlaceholder')}
          value={password}
          onChange={setPassword}
        />

        <PasswordInput
          label={t('confirmPassword')}
          placeholder={t('passwordPlaceholder')}
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          {t('resetAction')}
        </Button>
      </form>

      <div className="mt-5 text-center text-xs text-black">
        <Link to="/login" className="text-black hover:text-black">
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  )
}



