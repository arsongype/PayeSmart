import React, { type InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  helperText?: string
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-black ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-black">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            w-full rounded-xl border bg-gray-50 backdrop-blur-sm px-4 py-2.5 text-sm text-black
             placeholder:text-black transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-gray-50
            hover:border-gray-300
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-rose-500/50 focus:ring-rose-500/50 focus:border-rose-500' : 'border-gray-300/50'}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
           <div className="absolute right-3 top-1/2 -translate-y-1/2 text-black">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-black ml-1 animate-fade-in">{error}</p>
      )}
      {helperText && !error && (
         <p className="text-xs text-black ml-1">{helperText}</p>
      )}
    </div>
  )
}



