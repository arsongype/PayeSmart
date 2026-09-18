import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { PasswordInput } from '../common/PasswordInput'
import type { RegisterFormData } from '../../utils/validators'
import { registerSchema } from '../../utils/validators'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useTranslation } from '../../utils/i18n'

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
      console.error('Register validation error:', err)
      if (err instanceof Error && 'issues' in err) {
        const zodErr = err as { issues?: Array<{ path?: (string | number)[]; message?: string }> }
        const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {}
        zodErr.issues?.forEach((issue) => {
          const key = issue.path?.[0] as keyof RegisterFormData | undefined
          if (key && issue.message) {
            fieldErrors[key] = issue.message
          }
        })
        console.error('Register field errors:', fieldErrors)
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

    console.log('Register form submitted', formData)

    if (!validate()) {
      console.log('Register validation failed')
      return
    }

    setIsLoading(true)

    try {
      console.log('Register API call...')
      const response = await register(formData)
      console.log('Register API success:', response)
      setSuccess(t('successRedirect'))
      setTimeout(() => {
        onSuccess?.()
      }, 1200)
    } catch (err) {
      console.error('Register API error:', err)
      if (axios.isAxiosError(err) && !err.response) {
        setError(t('cannotReachServer'))
      } else if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } }
        setError(axiosError.response?.data?.message || t('registrationFailed'))
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t('registrationFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-md mx-auto">
      <div className="space-y-0.5 text-center">
        <h1 className="text-xl font-bold text-black">{t('registerTitle')}</h1>
        <p className="text-xs text-black">{t('joinPlatform')}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-2.5 text-xs text-black">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/50 p-2.5 text-xs text-green-400">
          {success}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label={t('firstNameLabelRegister')}
            placeholder={t('firstNamePlaceholder')}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={errors.firstName}
          />
          <Input
            label={t('lastNameLabelRegister')}
            placeholder={t('lastNamePlaceholder')}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={errors.lastName}
          />
        </div>

        <Input
          label={t('addressLabelRegister')}
          placeholder={t('addressPlaceholder')}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          error={errors.address}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label={t('cityLabelRegister')}
            placeholder={t('cityPlaceholder')}
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            error={errors.city}
          />
          <Input
            label={t('postalCodeLabelRegister')}
            placeholder={t('postalCodePlaceholder')}
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            error={errors.postalCode}
          />
        </div>

        <Input
          label={t('countryLabelRegister')}
          placeholder={t('countryPlaceholder')}
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          error={errors.country}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label={t('cinLabelRegister')}
            placeholder={t('cinPlaceholder')}
            value={formData.cin}
            onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
            error={errors.cin}
          />
          <Input
            label={t('phoneLabelRegister')}
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
          />
        </div>

        <Input
          label={t('emailLabelRegister')}
          type="email"
          placeholder={t('emailPlaceholder')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-black mb-1">{t('dateOfBirthLabel')}</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs text-black focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {errors.dateOfBirth && <p className="mt-1 text-xs text-black">{errors.dateOfBirth}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-black mb-1">{t('accountTypeLabel')}</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as RegisterFormData['role'] })}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs text-black focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="USER">{t('individualType')}</option>
              <option value="MERCHANT">{t('merchantType')}</option>
              <option value="ADMIN">{t('adminType')}</option>
            </select>
          </div>
        </div>

        <PasswordInput
          label={t('passwordLabelRegister')}
          placeholder={t('passwordPlaceholder')}
          value={formData.password}
          onChange={(value) => setFormData({ ...formData, password: value })}
          error={errors.password}
        />

        <PasswordInput
          label={t('confirmPasswordLabel')}
          placeholder={t('passwordPlaceholder')}
          value={formData.confirmPassword}
          onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
          error={errors.confirmPassword}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full shadow-lg shadow-primary-900/20 hover:shadow-xl hover:shadow-primary-900/30"
          isLoading={isLoading}
        >
          {t('createAccountButton')}
        </Button>
      </div>

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs text-black hover:text-black transition-colors"
        >
          {t('alreadyHaveAccount')}
        </Link>
      </div>
    </form>
  )
}



