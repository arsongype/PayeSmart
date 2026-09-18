import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'

interface PasswordInputProps {
  label?: string
  error?: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
}

export function PasswordInput({
  label,
  error,
  hint,
  value,
  onChange,
  placeholder,
  id,
  className = '',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { t } = useTranslation()
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-black mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full rounded-lg border bg-gray-50 text-black
            placeholder-dark-500
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            pl-4 pr-12 py-2.5 text-sm
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            ${className}
          `}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-black transition-colors"
          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-black">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-black">{hint}</p>}
    </div>
  )
}



