import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import { paymentService, type PaymentTransaction } from '../../services/payment.service'
import { useTranslation } from '../../utils/i18n'
import { formatAccountNumber } from '../../utils/formatters'

export default function ConfirmQrPage() {
  const { id } = useParams<{ id: string }>()
  const { t, formatMoney } = useTranslation()
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authenticatorCode, setAuthenticatorCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const transactionId = Number(id)

  useEffect(() => {
    if (!transactionId || Number.isNaN(transactionId)) return
    let cancelled = false
    void paymentService.getQrConfirmation(transactionId)
      .then((payment) => {
        if (!cancelled) {
          setTransaction(payment)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(axios.isAxiosError(err) && err.response?.status === 404
            ? t('onlyRecipientCanConfirm')
            : err instanceof Error ? err.message : t('transactionNotFound'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [transactionId, t])

  const confirm = async () => {
    if (!transactionId || Number.isNaN(transactionId) || !transaction?.canConfirmQr) return
    try {
      setSubmitting(true)
      setError('')
      const updated = await paymentService.confirmQr(transactionId, authenticatorCode)
      setTransaction({ ...updated, recipient: transaction.recipient, canConfirmQr: true })
      window.dispatchEvent(new Event('paysmart:notifications-refresh'))
      if (updated.status === 'COMPLETED') {
        setSuccess(t('qrPaymentConfirmed'))
      } else {
        setError(updated.failureReason || t('cannotConfirmQr'))
      }
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

        {error && <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-base text-red-800">{error}</div>}
        {success && <div role="status" className="rounded-2xl border border-green-300 bg-green-50 p-4 text-base text-green-800">{success}</div>}
        {loading && <p className="text-center text-base">{t('loading')}</p>}
        {!loading && transaction && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-gray-300 bg-white p-4 text-sm">
              <p>{t('beneficiary')}: <strong>{transaction.recipient?.name || '—'}</strong></p>
              <p>{t('bankAccount')}: <strong className="font-mono">{transaction.recipient?.walletNumber ? formatAccountNumber(transaction.recipient.walletNumber) : '—'}</strong></p>
              <p>{t('transactionAmount')}: <strong>{formatMoney(Number(transaction.amount), transaction.currency)}</strong></p>
              <p>{t('transactionFee')}: <strong>{formatMoney(Number(transaction.feeAmount ?? 0), transaction.currency)}</strong></p>
              <p className="border-t border-gray-200 pt-2">{t('transactionTotal')}: <strong>{formatMoney(Number(transaction.totalAmount ?? transaction.amount), transaction.currency)}</strong></p>
            </div>
            {!transaction.canConfirmQr && (
              <p className="rounded-xl border border-blue-400/50 bg-blue-50 p-3 text-sm text-black">{t('onlyRecipientCanConfirm')}</p>
            )}
            {transaction.status === 'PENDING' && transaction.canConfirmQr && (
              <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-950">{t('qrPaymentCodeDescription')}</p>
                <div className="flex justify-center rounded-xl bg-white p-4">
                  <QRCodeSVG
                    value={`${window.location.origin}/payments/confirm/${transaction.id}`}
                    size={192}
                    level="M"
                    includeMargin
                  />
                </div>
                <p className="text-sm text-blue-950">{t('qrAuthenticatorRequired')}</p>
                <Link to="/settings" className="inline-block text-sm font-semibold text-primary-700 underline underline-offset-2">
                  {t('setupGoogleAuthenticator')}
                </Link>
                <label className="block text-sm font-medium text-gray-900" htmlFor="qr-authenticator-code">{t('googleAuthenticatorCode')}</label>
                <input
                  id="qr-authenticator-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={authenticatorCode}
                  onChange={(event) => setAuthenticatorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 font-mono text-black outline-none focus:border-primary-500"
                />
                <button type="button" onClick={() => void confirm()} disabled={submitting || authenticatorCode.length !== 6} className="w-full rounded-2xl border border-gray-400 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">
                  {submitting ? t('processing') : t('confirmQr')}
                </button>
              </div>
            )}
            {transaction.status !== 'PENDING' && (
              <p className="text-center text-sm text-black">{t('paymentStatus', { status: transaction.status })}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
