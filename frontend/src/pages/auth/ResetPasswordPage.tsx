import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { PasswordInput } from '../../components/common/PasswordInput'
import { resetPasswordSchema } from '../../utils/validators'

export default function ResetPasswordPage() {
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
        throw new Error('Réinitialisation impossible')
      }

      setMessage('Votre mot de passe a été réinitialisé avec succès.')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800/80 p-6 shadow-2xl shadow-dark-950/50">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-dark-50">Réinitialiser le mot de passe</h1>
        <p className="mt-2 text-sm text-dark-300">Choisissez un nouveau mot de passe sécurisé.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Token" value={token} readOnly className="bg-dark-900/60" />

        <PasswordInput
          label="Nouveau mot de passe"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
        />

        <PasswordInput
          label="Confirmer le mot de passe"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Réinitialiser
        </Button>
      </form>

      <div className="mt-5 text-center text-xs text-dark-300">
        <Link to="/login" className="text-primary-400 hover:text-primary-300">
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
