import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { LoginFormData } from '../../utils/validators'
import { loginSchema } from '../../utils/validators'
import { useAuth } from '../../contexts/AuthContext'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth()
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
          setError('Erreur de validation')
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
      setError(err instanceof Error ? err.message : 'Échec de la connexion')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-md mx-auto">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold text-dark-50 tracking-tight">Connexion</h1>
        <p className="text-sm text-dark-300">Content de vous revoir sur Paysmart</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-dark-200">Email</label>
          <Input
            type="email"
            placeholder="vous@exemple.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            className="h-11 rounded-xl"
          />
          {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-dark-200">Mot de passe</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              className="h-11 rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-red-400 mt-1">{errors.password}</p>}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          isLoading={isLoading}
        >
          Se connecter
        </Button>
      </div>

      <div className="text-center pt-1">
        <span className="text-xs text-dark-400">Vous n'avez pas de compte ? </span>
        <Link
          to="/register"
          className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
        >
          Créer un compte
        </Link>
      </div>
    </form>
  )
}
