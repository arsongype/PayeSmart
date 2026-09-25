import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Phone, Home, MapPin, Globe, CreditCard, Lock, Calendar, Shield, ChevronRight } from 'lucide-react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { PasswordInput } from '../common/PasswordInput'
import type { RegisterFormData } from '../../utils/validators'
import { registerSchema } from '../../utils/validators'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../utils/i18n'
import logo from '../../assets/Logo.png'

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register } = useAuth()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    cin: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    role: 'USER',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({})

  const validate = (): boolean => {
    try {
      registerSchema.parse(formData)
      setErrors({})
      return true
    } catch (err) {
      if (err instanceof Error && 'issues' in err) {
        const zodErr = err as { issues?: Array<{ path?: (string | number)[]; message?: string }> }
        const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {}
        zodErr.issues?.forEach((issue) => {
          const key = issue.path?.[0] as keyof RegisterFormData | undefined
          if (key && issue.message) {
            fieldErrors[key] = issue.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setError(t('validationError'))
      }
      return false
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await register(formData)
      void response
      setSuccess(t('successRedirect'))
      setTimeout(() => {
        onSuccess?.()
      }, 1200)
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message)
      } else {
        setError(t('registrationFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="app-surface rounded-2xl p-6 md:p-8 animate-fade-in">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center pb-2">
            <div className="relative inline-block">
              <img src={logo} alt={t('paysmart')} className="mx-auto mb-3 h-auto w-28 object-contain drop-shadow-lg" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-linear-to-r from-primary-400 to-primary-600 rounded-full" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Créer un compte</h1>
            <p className="text-sm text-gray-500 mt-1">Rejoignez PayeSmart en quelques secondes</p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-600 animate-fade-in flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-600 animate-fade-in flex items-start gap-2">
              <span className="mt-0.5 shrink-0">✓</span>
              {success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              placeholder="Prénom"
              leftIcon={<User size={16} />}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={errors.firstName}
              required
            />
            <Input
              label="Nom"
              placeholder="Nom"
              leftIcon={<User size={16} />}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              error={errors.lastName}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Téléphone"
              placeholder="+261 38 00 000 00"
              leftIcon={<Phone size={16} />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={errors.phone}
              required
            />
            <Input
              label="Adresse"
              placeholder="Adresse"
              leftIcon={<Home size={16} />}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              error={errors.address}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ville"
              placeholder="Ville"
              leftIcon={<MapPin size={16} />}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              error={errors.city}
              required
            />
            <Input
              label="Code postal"
              placeholder="Code postal"
              leftIcon={<CreditCard size={16} />}
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              error={errors.postalCode}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pays"
              placeholder="Pays"
              leftIcon={<Globe size={16} />}
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              error={errors.country}
              required
            />
            <Input
              label="CIN"
              placeholder="CIN"
              leftIcon={<Shield size={16} />}
              value={formData.cin}
              onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
              error={errors.cin}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">Informations personnelles</span>
            </div>
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            leftIcon={<Mail size={16} />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date de naissance
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-xl border border-gray-300/50 bg-gray-50 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-gray-50 hover:border-gray-300"
                />
              </div>
              {errors.dateOfBirth && <p className="mt-1.5 text-xs text-rose-500 ml-1">{errors.dateOfBirth}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type de compte
              </label>
              <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={formData.role}
                  required
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as RegisterFormData['role'] })}
                  className="w-full rounded-xl border border-gray-300/50 bg-gray-50 pl-10 pr-4 py-2.5 text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-gray-50 hover:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value="USER">Particulier</option>
                  <option value="MERCHANT">Commerçant</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PasswordInput
              label="Mot de passe"
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              error={errors.password}
              required
            />
            <PasswordInput
              label="Confirmer"
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              value={formData.confirmPassword}
              onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
              error={errors.confirmPassword}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/25"
            isLoading={isLoading}
            leftIcon={<Shield size={18} />}
          >
            S'inscrire
          </Button>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
