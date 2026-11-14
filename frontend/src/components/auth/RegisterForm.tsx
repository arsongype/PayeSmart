import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Phone, Home, MapPin, Globe, CreditCard, Lock, Calendar, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const steps = [
    { title: 'Informations personnelles', fields: ['firstName', 'lastName', 'dateOfBirth', 'cin'] },
    { title: 'Coordonnées', fields: ['email', 'phone'] },
    { title: 'Localisation', fields: ['address', 'city', 'postalCode', 'country'] },
    { title: 'Sécurité du compte', fields: ['role', 'password', 'confirmPassword'] },
  ] as const
  const [currentStep, setCurrentStep] = useState(0)
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

  const validate = (fields?: readonly string[]): boolean => {
    const result = registerSchema.safeParse(formData)
    if (result.success) {
      setErrors({})
      return true
    }

    const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {}
    result.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof RegisterFormData | undefined
      if (key && issue.message && (!fields || fields.includes(key))) {
        fieldErrors[key] = issue.message
      }
    })
    setErrors(fieldErrors)
    return Object.keys(fieldErrors).length === 0
  }

  const handleNext = () => {
    setError(null)
    if (validate(steps[currentStep].fields)) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
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
      await register({
        ...formData,
        firstName: formData.firstName?.trim() || undefined,
      })
      setSuccess(t('accountCreatedSuccess'))
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
    <div className="w-full max-w-5xl mx-auto">
      <div className="app-surface rounded-2xl p-4 md:p-5 animate-fade-in">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="col-span-full text-center">
            <div className="relative inline-block">
              <img src={logo} alt={t('paysmart')} className="mx-auto mb-1 h-auto w-28 rounded-lg bg-white px-3 py-1 object-contain" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-linear-to-r from-primary-400 to-primary-600 rounded-full" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Créer un compte</h1>
            <p className="text-xs text-gray-600">Suivez les étapes pour créer votre compte</p>
          </div>

          <div aria-label="Progression de l'inscription" className="space-y-2">
            <div className="flex items-center justify-between gap-1">
              {steps.map((step, index) => (
                <div key={step.title} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    aria-current={index === currentStep ? 'step' : undefined}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      index <= currentStep ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className={`hidden truncate text-xs sm:block ${index === currentStep ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && <span className="h-px min-w-2 flex-1 bg-gray-200" />}
                </div>
              ))}
            </div>
            <p className="text-center text-xs font-medium text-gray-600 sm:hidden">
              Étape {currentStep + 1} sur {steps.length} : {steps[currentStep].title}
            </p>
          </div>

          {error && (
            <div role="alert" className="col-span-full flex animate-fade-in items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-2 text-sm text-red-800">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="col-span-full flex animate-fade-in items-start gap-2 rounded-xl border border-green-300 bg-green-50 p-2 text-sm text-green-800">
              <span className="mt-0.5 shrink-0">✓</span>
              {success}
            </div>
          )}

          {currentStep === 0 && <section aria-labelledby="personal-info-heading">
            <h2 id="personal-info-heading" className="mb-2 border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label={<>Prénom <span className="font-normal text-gray-500">(facultatif)</span></>}
                placeholder="Prénom"
                leftIcon={<User size={16} />}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                error={errors.firstName}
                className="h-9"
              />
              <Input
                label="Nom"
                placeholder="Nom"
                leftIcon={<User size={16} />}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                error={errors.lastName}
                required
                className="h-9"
              />
              <div className="min-w-0">
                <label htmlFor="dateOfBirth" className="mb-1 block text-xs font-semibold text-gray-800">
                  Date de naissance
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    id="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="h-9 w-full rounded-xl border border-gray-300/50 bg-gray-50 pl-10 pr-2 text-xs text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-gray-50 hover:border-gray-300"
                  />
                </div>
                {errors.dateOfBirth && <p role="alert" className="mt-1 text-xs text-red-700">{errors.dateOfBirth}</p>}
              </div>
              <Input
                label="CIN (facultatif)"
                placeholder="CIN"
                leftIcon={<Shield size={16} />}
                value={formData.cin}
                onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                error={errors.cin}
                className="h-9"
              />
            </div>
          </section>}

          {currentStep === 1 && <section aria-labelledby="contact-info-heading">
            <h2 id="contact-info-heading" className="mb-2 border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Coordonnées
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Email"
                type="email"
                placeholder="email@example.com"
                leftIcon={<Mail size={16} />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                required
                className="h-9"
              />
              <Input
                label="Téléphone"
                placeholder="+261 38 00 000 00"
                leftIcon={<Phone size={16} />}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={errors.phone}
                required
                className="h-9"
              />
            </div>
          </section>}

          {currentStep === 2 && <section aria-labelledby="location-heading">
            <h2 id="location-heading" className="mb-2 border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Localisation
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Adresse"
                placeholder="Adresse"
                leftIcon={<Home size={16} />}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                error={errors.address}
                required
                className="h-9"
              />
              <Input
                label="Ville"
                placeholder="Ville"
                leftIcon={<MapPin size={16} />}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                error={errors.city}
                required
                className="h-9"
              />
              <Input
                label="Code postal"
                placeholder="Code postal"
                leftIcon={<CreditCard size={16} />}
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                error={errors.postalCode}
                required
                className="h-9"
              />
              <Input
                label="Pays (ISO-2)"
                placeholder="MG"
                leftIcon={<Globe size={16} />}
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value.slice(0, 2).toUpperCase() })}
                error={errors.country}
                required
                className="h-9"
              />
            </div>
          </section>}

          {currentStep === 3 && <section aria-labelledby="security-heading">
            <h2 id="security-heading" className="mb-2 border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Sécurité du compte
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0">
                <label htmlFor="accountRole" className="mb-1 block text-xs font-semibold text-gray-800">
                  Type de compte
                </label>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <select
                    id="accountRole"
                    value={formData.role}
                    required
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as RegisterFormData['role'] })}
                    className="h-9 w-full appearance-none rounded-xl border border-gray-300/50 bg-gray-50 pl-10 pr-7 text-xs text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-gray-50 hover:border-gray-300"
                  >
                    <option value="USER">Particulier</option>
                    <option value="MERCHANT">Commerçant</option>
                  </select>
                  <ChevronRight size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-gray-600" />
                </div>
              </div>
              <PasswordInput
                label="Mot de passe"
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                error={errors.password}
                required
                className="h-9"
              />
              <PasswordInput
                label="Confirmer le mot de passe"
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
                value={formData.confirmPassword}
                onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                error={errors.confirmPassword}
                required
                className="h-9"
              />
            </div>
          </section>}

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-10 flex-1 rounded-xl text-sm font-semibold"
                onClick={() => {
                  setError(null)
                  setCurrentStep((step) => Math.max(step - 1, 0))
                }}
              >
                <ChevronLeft size={18} />
                Précédent
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="h-10 flex-1 rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/25"
                rightIcon={<ChevronRight size={18} />}
                onClick={handleNext}
              >
                Suivant
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="h-10 flex-1 rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/25"
                isLoading={isLoading}
                leftIcon={<Shield size={18} />}
              >
                S'inscrire
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-gray-700">
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
