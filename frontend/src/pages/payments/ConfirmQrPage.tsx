import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { paymentService } from '../../services/payment.service'
import { useTranslation } from '../../utils/i18n'

export default function ConfirmQrPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!error && !success) return
    const timeoutId = window.setTimeout(() => {
      setError('')
      setSuccess('')
    }, 10000)
    return () => window.clearTimeout(timeoutId)
  }, [error, success])

  const transactionId = Number(id)
  const confirmationUrl = typeof window !== 'undefined' ? `${window.location.origin}/payments/confirm/${transactionId}` : ''

  useEffect(() => {
    if (!transactionId || Number.isNaN(transactionId)) {
      setError(t('transactionNotFound'))
    }
  }, [transactionId, t])

  const confirm = async () => {
    if (!transactionId || Number.isNaN(transactionId)) return
    try {
      setSubmitting(true)
      setError('')
      const transaction = await paymentService.confirmQr(transactionId)
      setSuccess(t('qrConfirmedByRecipient', { reference: transaction.externalReference ?? `#${transaction.id}` }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotConfirmQr'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!transactionId || Number.isNaN(transactionId)) {
    return <Navigate to="/payments" replace />
  }

  return (
    <div className="page-enter flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black">{t('qrConfirmation')}</h1>
          <p className="mt-2 text-base text-black">{t('qrConfirmationDescription')}</p>
        </div>

        {error && <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-base text-black">{error}</div>}
        {success && <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-base text-black">{success}</div>}
        {!success && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-2xl border border-white/40 bg-white p-2">
                <QRCodeSVG value={confirmationUrl} size={180} level="M" includeMargin={false} />
              </div>
            </div>
            <button type="button" onClick={confirm} disabled={submitting} className="w-full rounded-2xl border border-gray-400 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">
              {submitting ? t('processing') : t('confirmQr')}
            </button>
          </div>
        )}
        <p className="text-center text-sm text-black">{t('onlyRecipientCanConfirm')}</p>
      </div>
    </div>
  )
}
