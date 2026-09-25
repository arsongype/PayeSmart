import { useState, type ReactNode } from 'react'
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
  required?: boolean
  leftIcon?: ReactNode
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
  required = false,
  leftIcon,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { t } = useTranslation()
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-black">
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`
            w-full rounded-lg border bg-gray-50 text-black
            placeholder-dark-500
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : 'pl-4'} pr-12 py-2.5 text-sm
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



