import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { forgotPasswordSchema } from '../../utils/validators'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Impossible d’envoyer le lien de réinitialisation')
      }

      setMessage('Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.')
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800/80 p-6 shadow-2xl shadow-dark-950/50">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-dark-50">Mot de passe oublié</h1>
        <p className="mt-2 text-sm text-dark-300">Entrez votre email pour recevoir un lien de réinitialisation.</p>
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
        <Input
          label="Email"
          type="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Envoyer le lien
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
