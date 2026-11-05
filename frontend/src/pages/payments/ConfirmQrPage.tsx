import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import axios from 'axios'
import { paymentService, type PaymentTransaction } from '../../services/payment.service'
import { useTranslation } from '../../utils/i18n'

export default function ConfirmQrPage() {
  const { id } = useParams<{ id: string }>()
  const { t, formatMoney } = useTranslation()
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
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
          setNeedsTwoFactor(payment.failureReason === 'Vérification 2FA requise avant exécution.')
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
      const updated = await paymentService.confirmQr(transactionId)
      setTransaction({ ...updated, recipient: transaction.recipient, canConfirmQr: true })
      window.dispatchEvent(new Event('paysmart:notifications-refresh'))
      const requiresTwoFactor = updated.failureReason === 'Vérification 2FA requise avant exécution.'
      setNeedsTwoFactor(requiresTwoFactor)
      setSuccess(requiresTwoFactor
        ? t('qrNeedsTwoFactor')
        : t('qrPaymentConfirmed', { reference: updated.externalReference ?? `#${updated.id}` }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotConfirmQr'))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmTwoFactor = async () => {
    if (!transaction || !/^\d{6}$/.test(twoFactorCode)) return
    try {
      setSubmitting(true)
      setError('')
      const updated = await paymentService.confirmTwoFactor(transaction.id, twoFactorCode)
      setTransaction({ ...updated, recipient: transaction.recipient, canConfirmQr: true })
      setNeedsTwoFactor(false)
      setTwoFactorCode('')
      setSuccess(t('paymentConfirmed2fa'))
      window.dispatchEvent(new Event('paysmart:notifications-refresh'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalid2faCode'))
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
        {loading && <p className="text-center text-base">{t('loading')}</p>}
        {!loading && transaction && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-gray-300 bg-white p-4 text-sm">
              <p>{t('beneficiary')}: <strong>{transaction.recipient?.name || '—'}</strong></p>
              <p>{t('bankAccount')}: <strong className="font-mono">{transaction.recipient?.walletNumber || '—'}</strong></p>
              <p>{t('transactionAmount')}: <strong>{formatMoney(Number(transaction.amount), transaction.currency)}</strong></p>
              <p>{t('transactionFee')}: <strong>{formatMoney(Number(transaction.feeAmount ?? 0), transaction.currency)}</strong></p>
              <p className="border-t border-gray-200 pt-2">{t('transactionTotal')}: <strong>{formatMoney(Number(transaction.totalAmount ?? transaction.amount), transaction.currency)}</strong></p>
            </div>
            {!transaction.canConfirmQr && (
              <p className="rounded-xl border border-amber-400/50 bg-amber-50 p-3 text-sm text-black">{t('onlyRecipientCanConfirm')}</p>
            )}
            {needsTwoFactor && transaction.canConfirmQr && (
              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="qr-two-factor-code">{t('codeReceived')}</label>
                <input
                  id="qr-two-factor-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 font-mono text-black outline-none focus:border-primary-500"
                />
                <button type="button" onClick={() => void confirmTwoFactor()} disabled={submitting || twoFactorCode.length !== 6} className="w-full rounded-2xl border border-gray-400 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">
                  {submitting ? t('processing') : t('confirmPayment')}
                </button>
              </div>
            )}
            {!success && !needsTwoFactor && transaction.status === 'PENDING' && transaction.canConfirmQr && (
              <button type="button" onClick={() => void confirm()} disabled={submitting} className="w-full rounded-2xl border border-gray-400 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">
                {submitting ? t('processing') : t('confirmQr')}
              </button>
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
