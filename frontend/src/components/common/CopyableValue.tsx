import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'

interface CopyableValueProps {
  value: string
  displayValue: string
  label: string
  className?: string
}

export function CopyableValue({ value, displayValue, label, className = '' }: CopyableValueProps) {
  const { t } = useTranslation()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.setTimeout(() => setCopyState('idle'), 2500)
  }

  const copyLabel = t('copySensitiveData', { label })

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void copyValue()}
        aria-label={copyLabel}
        title={copyLabel}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-md text-left hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${className}`}
      >
        <span className="break-all">{displayValue}</span>
        {copyState === 'copied'
          ? <Check className="h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
          : <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </button>
      {copyState !== 'idle' && (
        <span role={copyState === 'copied' ? 'status' : 'alert'} className={`text-xs ${copyState === 'copied' ? 'text-green-700' : 'text-red-700'}`}>
          {copyState === 'copied' ? t('copied') : t('copyFailed')}
        </span>
      )}
    </span>
  )
}
