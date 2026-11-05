import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, BadgeCheck, Building2, CheckCircle2, Clock3, CreditCard, Eye, EyeOff, Printer, QrCode, RefreshCw, Send, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, type PaymentChannel, type PaymentCurrency, type PaymentQuote, type PaymentTransaction, type RecipientAccount } from '../../services/payment.service'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../utils/i18n'
import { isSandboxCardCvvValid, isSandboxCardExpiryValid } from '../../utils/sandbox-card'
import { useSandboxDynamicCvv } from '../../hooks/useSandboxDynamicCvv'
import { formatAccountNumber, getCurrencySymbol } from '../../utils/formatters'

type PaymentMode = 'CARD' | 'QR' | 'BANK_TRANSFER'

function generateSandboxCardToken(): string {
  return `tok_test_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`
}

function getPaymentErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
  }
  return error instanceof Error ? error.message : fallback
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { t, formatMoney } = useTranslation()
  const dynamicCvv = useSandboxDynamicCvv(user?.id ?? 0)
  const locale = settings.language === 'en' ? 'en-US' : 'fr-FR'
  const [recipientWalletNumber, setRecipientWalletNumber] = useState('')
  const [recipient, setRecipient] = useState<RecipientAccount | null>(null)
  const [amount, setAmount] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [showCardCvv, setShowCardCvv] = useState(false)
  const [showDynamicCvv, setShowDynamicCvv] = useState(false)
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>('MGA')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CARD')
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [history, setHistory] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastTransaction, setLastTransaction] = useState<PaymentTransaction | null>(null)
  const [hiddenReceiptId, setHiddenReceiptId] = useState<number | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [confirmingTwoFactor, setConfirmingTwoFactor] = useState(false)
  const [twoFactorRemainingSeconds, setTwoFactorRemainingSeconds] = useState<number | null>(null)
  const notificationRefreshTransaction = useRef<number | null>(null)
  const translationRef = useRef(t)
  const [historyPage, setHistoryPage] = useState(1)
  const historyPageSize = 5
  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize))
  const visibleHistory = history.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
  const completedCount = history.filter((transaction) => transaction.status === 'COMPLETED').length
  const pendingCount = history.filter((transaction) => transaction.status === 'PENDING' || transaction.status === 'PROCESSING').length
  const channel: PaymentChannel = paymentMode
  const currentQuote = paymentQuote?.currency === paymentCurrency
    && paymentQuote.amount === Number(amount)
    ? paymentQuote
    : null

  useEffect(() => {
    const parsedAmount = Number(amount)
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount < 0.01) return

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingQuote(true)
        const quote = await paymentService.quote(parsedAmount, paymentCurrency)
        if (!cancelled) setPaymentQuote(quote)
      } catch (err) {
        if (!cancelled) {
          setPaymentQuote(null)
          setError(getPaymentErrorMessage(err, translationRef.current('cannotCalculateFee')))
        }
      } finally {
        if (!cancelled) setLoadingQuote(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [amount, paymentCurrency])

  useEffect(() => {
    if (!success) return
    const timeoutId = window.setTimeout(() => {
      setSuccess(null)
    }, 6000)
    return () => window.clearTimeout(timeoutId)
  }, [success])

  const statusLabel: Record<PaymentTransaction['status'], string> = {
    PENDING: t('pending'),
    PROCESSING: t('inProgress'),
    COMPLETED: t('completed'),
    FAILED: t('failed'),
  }

  useEffect(() => {
    translationRef.current = t
  }, [t])

  const twoFactorExpiresAt = lastTransaction?.metadata?.twoFactorExpiresAt

  useEffect(() => {
    if (!twoFactorExpiresAt) {
      const timeoutId = window.setTimeout(() => setTwoFactorRemainingSeconds(null), 0)
      return () => window.clearTimeout(timeoutId)
    }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((Date.parse(twoFactorExpiresAt) - Date.now()) / 1000))
      setTwoFactorRemainingSeconds(remaining)
    }
    const initialTimeoutId = window.setTimeout(updateCountdown, 0)
    const intervalId = window.setInterval(updateCountdown, 1000)
    return () => {
      window.clearTimeout(initialTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [twoFactorExpiresAt])

  const load = useCallback(async (restorePendingTwoFactor = false) => {
    try {
      setLoading(true)
      const transactions = await paymentService.history()
      setHistory(transactions)
      setHistoryPage(1)
      const pendingTwoFactor = restorePendingTwoFactor
        ? transactions.find((transaction) => transaction.status === 'PENDING' && transaction.failureReason === 'Vérification 2FA requise avant exécution.')
        : undefined
      if (pendingTwoFactor) {
        setLastTransaction(pendingTwoFactor)
        setSuccess(translationRef.current('paymentCreated', { reference: pendingTwoFactor.externalReference ?? `#${pendingTwoFactor.id}`, status: translationRef.current('pending') }))
      }
    } catch (err) {
      setError(getPaymentErrorMessage(err, translationRef.current('cannotLoadPayments')))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const timeoutId = window.setTimeout(() => void load(true), 0)
    return () => window.clearTimeout(timeoutId)
  }, [user?.id, load])

  const pollingTransactionId = lastTransaction?.id
  const pollingTransactionChannel = lastTransaction?.channel
  const pollingTransactionNeedsTwoFactor = lastTransaction?.channel !== 'QR'
    && lastTransaction?.status === 'PENDING'
    && lastTransaction.failureReason === 'Vérification 2FA requise avant exécution.'

  useEffect(() => {
    if (
      !pollingTransactionId
      || lastTransaction?.status === 'COMPLETED'
      || lastTransaction?.status === 'FAILED'
      || pollingTransactionNeedsTwoFactor
    ) {
      return
    }
    let timeoutId: ReturnType<typeof window.setTimeout> | undefined = undefined
    const poll = async () => {
      try {
        const updated = await paymentService.get(pollingTransactionId)
        setLastTransaction(updated)
        if (
          updated.failureReason === 'Vérification 2FA requise avant exécution.'
          && notificationRefreshTransaction.current !== updated.id
        ) {
          notificationRefreshTransaction.current = updated.id
          window.dispatchEvent(new Event('paysmart:notifications-refresh'))
        }
        if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
          setSuccess(updated.status === 'COMPLETED'
            ? updated.channel === 'QR'
              ? translationRef.current('qrPaymentConfirmed', { reference: updated.externalReference ?? `#${updated.id}` })
              : translationRef.current('paymentConfirmedLedger')
            : translationRef.current('paymentFailed', { reason: updated.failureReason ?? translationRef.current('unknownRecipient') }))
          window.dispatchEvent(new Event('paysmart:notifications-refresh'))
          await load(false)
          return
        }
        if (updated.status === 'PENDING' && updated.failureReason === 'Vérification 2FA requise avant exécution.') {
          return
        }
      } catch {
        // ignore polling errors
      }
      timeoutId = window.setTimeout(poll, pollingTransactionChannel === 'QR' ? 15_000 : 10_000)
    }
    void poll()
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [pollingTransactionId, pollingTransactionChannel, lastTransaction?.status, lastTransaction?.failureReason, pollingTransactionNeedsTwoFactor, load])

  const terminalTransactionId = lastTransaction?.id
  const terminalTransactionStatus = lastTransaction?.status

  useEffect(() => {
    if (!terminalTransactionId || (terminalTransactionStatus !== 'COMPLETED' && terminalTransactionStatus !== 'FAILED')) return
    const timeoutId = window.setTimeout(() => setHiddenReceiptId(terminalTransactionId), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [terminalTransactionId, terminalTransactionStatus])

  const findRecipient = async () => {
    const lookupValue = recipientWalletNumber.trim()
    if (!/^\d+$/.test(lookupValue)) {
      setError(t('accountDigitsOnly'))
      setRecipient(null)
      return
    }
    try {
      setError(null)
      setRecipient(await paymentService.findRecipient(lookupValue))
    } catch (err) {
      setRecipient(null)
      setError(getPaymentErrorMessage(err, t('recipientNotFound')))
    }
  }

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!recipient || !amount) return
    if (paymentMode === 'CARD') {
      if (!isSandboxCardExpiryValid(cardExpiry)) {
        setError(t('invalidExpiry'))
        return
      }
      if (!isSandboxCardCvvValid(cardCvv)) {
        setError(t('invalidCvv'))
        return
      }
      if (cardCvv !== dynamicCvv) {
        setError(t('invalidCvv'))
        return
      }
    }
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)
      const transaction = await paymentService.initiate({
        recipientWalletNumber: recipient.walletNumber,
        amount: Number(amount),
        channel,
        currency: paymentCurrency,
        cardToken: paymentMode === 'CARD' ? generateSandboxCardToken() : undefined,
      })
      setLastTransaction(transaction)
      setHiddenReceiptId(null)
      setSuccess(t('paymentCreated', { reference: transaction.externalReference ?? `#${transaction.id}`, status: statusLabel[transaction.status] }))
      setAmount('')
      setPaymentQuote(null)
      setLoadingQuote(false)
      setRecipient(null)
      setRecipientWalletNumber('')
      setCardExpiry('')
      setCardCvv('')
      await load(false)
    } catch (err) {
      setError(getPaymentErrorMessage(err, t('cannotInitiatePayment')))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmTwoFactor = async () => {
    if (!lastTransaction || !/^\d{6}$/.test(twoFactorCode)) return
    const transactionId = lastTransaction.id
    try {
      setConfirmingTwoFactor(true)
      setError(null)
      const updated = await paymentService.confirmTwoFactor(transactionId, twoFactorCode.trim())
      setLastTransaction(updated)
      setHiddenReceiptId(null)
      setTwoFactorCode('')
      setSuccess(updated.status === 'COMPLETED' ? t('paymentConfirmed2fa') : t('paymentStatus', { status: statusLabel[updated.status] }))
      if (updated.status === 'COMPLETED') window.dispatchEvent(new Event('paysmart:notifications-refresh'))
      await load(false)
    } catch (err) {
      setError(getPaymentErrorMessage(err, t('invalid2faCode')))
      const refreshed = await paymentService.get(transactionId).catch(() => null)
      if (refreshed && refreshed.status === 'PENDING' && refreshed.failureReason === 'Vérification 2FA requise avant exécution.') {
        setLastTransaction(refreshed)
      }
    } finally {
      setConfirmingTwoFactor(false)
    }
  }

  const cancelPayment = async () => {
    if (!lastTransaction) return
    try {
      setError(null)
      const updated = await paymentService.cancel(lastTransaction.id)
      setLastTransaction(updated)
      setSuccess(t('paymentCancelled'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotCancelPayment'))
    }
  }

  const downloadReceipt = async () => {
    if (!lastTransaction) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFillColor(8, 123, 128)
    doc.roundedRect(12, 12, 186, 30, 4, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.text(t('receiptTitle'), 20, 31)
    doc.setTextColor(62, 58, 54)
    doc.setFontSize(10)
    doc.text(t('receiptReference', { ref: lastTransaction.externalReference ?? `#${lastTransaction.id}` }), 16, 54)
    doc.text(t('receiptDate', { date: new Date(lastTransaction.createdAt).toLocaleString(locale) }), 16, 62)
    doc.setDrawColor(220, 218, 212)
    doc.line(16, 68, 194, 68)
    doc.setFontSize(12)
    doc.text(t('receiptAmount', { amount: Number(lastTransaction.amount).toFixed(2), currency: lastTransaction.currency }), 20, 84)
    doc.text(t('receiptFee', { amount: Number(lastTransaction.feeAmount ?? 0).toFixed(2), currency: lastTransaction.currency }), 20, 96)
    doc.setFillColor(232, 247, 246)
    doc.roundedRect(16, 106, 178, 20, 3, 3, 'F')
    doc.setFontSize(14)
    doc.setTextColor(8, 123, 128)
    doc.text(t('receiptTotal', { amount: Number(lastTransaction.totalAmount ?? lastTransaction.amount).toFixed(2), currency: lastTransaction.currency }), 22, 119)
    doc.setTextColor(62, 58, 54)
    doc.setFontSize(11)
    doc.text(t('receiptChannel', { channel: lastTransaction.channel }), 20, 145)
    doc.text(t('receiptStatus', { status: statusLabel[lastTransaction.status] }), 20, 155)
    doc.save(`paysmart-recu-${lastTransaction.id}.pdf`)
  }

  return (
    <div className="page-enter min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40 p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/70 p-6 text-slate-900 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-white p-3 text-emerald-700 shadow-sm"><Send className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('payments')}</h1>
                <p className="mt-1 text-sm text-slate-600">{t('sendPayment')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} aria-label={t('refreshPayments')} className="border-emerald-200 bg-white/80 text-emerald-800 hover:bg-white hover:text-emerald-900">
              <RefreshCw className="h-4 w-4" /> {t('refresh')}
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: t('transactionHistory'), value: history.length, icon: CreditCard, tone: 'bg-blue-50 text-blue-700' },
            { label: t('completed'), value: completedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
            { label: t('pending'), value: pendingCount, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
          ].map((item) => (
            <article key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
              <div className={`rounded-xl p-2.5 ${item.tone}`}><item.icon className="h-5 w-5" /></div>
              <div><p className="text-xs font-medium text-slate-500">{item.label}</p><p className="mt-0.5 text-xl font-bold text-slate-900">{item.value}</p></div>
            </article>
          ))}
        </div>

        {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{error}</span></div>}
        {success && <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" /><span>{success}</span></div>}
        {lastTransaction && !(
          (lastTransaction.status === 'COMPLETED' || lastTransaction.status === 'FAILED')
          && hiddenReceiptId === lastTransaction.id
        ) && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-base text-slate-900 shadow-lg shadow-slate-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Référence · {lastTransaction.externalReference ?? `#${lastTransaction.id}`}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lastTransaction.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : lastTransaction.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{statusLabel[lastTransaction.status]}</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={downloadReceipt} className="rounded-xl border-slate-200 text-slate-700"><Printer className="h-4 w-4" /> {t('downloadReceipt')}</Button>
            </div>
            {lastTransaction.channel === 'QR' && lastTransaction.status === 'PENDING' && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <Clock3 className="h-5 w-5 shrink-0 text-amber-700" />
                <div><p className="font-semibold">{t('qrWaitingForRecipient')}</p><p className="mt-0.5 text-sm text-amber-800">{t('qrRecipientWillReceiveLink')}</p></div>
              </div>
            )}
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
              <p>{t('transactionAmount')}: <strong>{formatMoney(Number(lastTransaction.amount), lastTransaction.currency)}</strong></p>
              <p>{t('transactionFee')}: <strong>{formatMoney(Number(lastTransaction.feeAmount ?? 0), lastTransaction.currency)}</strong></p>
              <p>{t('transactionTotal')}: <strong>{formatMoney(Number(lastTransaction.totalAmount ?? lastTransaction.amount), lastTransaction.currency)}</strong></p>
            </div>
             {lastTransaction.channel !== 'QR' && lastTransaction.status === 'PENDING' && lastTransaction.failureReason === 'Vérification 2FA requise avant exécution.' && (
               <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                 <div className="min-w-48 flex-1">
                  {lastTransaction.channel === 'BANK_TRANSFER' && (
                    <p className="mb-2 text-sm text-black">{t('bankTransferOtpRequired')}</p>
                  )}
                   <label className="mb-1 block text-xs text-black" htmlFor="two-factor-code">
                  {t('codeReceived')}
                  <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                </label>
                   <input
                     id="two-factor-code"
                     inputMode="numeric"
                     maxLength={6}
                     required
                     disabled={twoFactorRemainingSeconds === 0}
                     value={twoFactorCode}
                     onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ''))}
                     placeholder="000000"
                     className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-mono text-black outline-none focus:border-primary-300"
                   />
                   {typeof twoFactorRemainingSeconds === 'number' && (
                     <p role={twoFactorRemainingSeconds === 0 ? 'alert' : undefined} className={`mt-1 text-xs ${twoFactorRemainingSeconds === 0 ? 'text-red-700' : 'text-black'}`}>
                       {twoFactorRemainingSeconds === 0 ? t('twoFactorExpired') : t('twoFactorExpiresIn', { seconds: twoFactorRemainingSeconds })}
                     </p>
                   )}
                 </div>
                  <Button type="button" size="sm" onClick={() => void confirmTwoFactor()} disabled={twoFactorCode.length !== 6 || confirmingTwoFactor || twoFactorRemainingSeconds === 0} isLoading={confirmingTwoFactor}>
                    {t('confirmPayment')}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void cancelPayment()} className="rounded-xl border border-gray-300">
                    {t('cancelPayment')}
                  </Button>
                </div>
              )}
          </div>
        )}

        <div className="w-full">
          <form onSubmit={submitPayment} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-2.5 text-emerald-700 shadow-sm ring-1 ring-emerald-100"><Send className="h-5 w-5" /></div>
                <div><h2 className="text-lg font-bold text-slate-900">{t('sendPayment')}</h2><p className="text-xs text-slate-500">Saisissez les coordonnées et vérifiez le total avant validation.</p></div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex"><ShieldCheck className="h-3.5 w-3.5" /> Paiement sécurisé</span>
            </div>
            <div className="space-y-6 p-5 sm:p-7">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="recipient-account">
              {t('recipientAccountNumber')}
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="recipient-account"
                inputMode="numeric"
                pattern="[0-9]+"
                required
                value={recipientWalletNumber}
                onChange={(event) => setRecipientWalletNumber(event.target.value.replace(/\D/g, ''))}
                placeholder="000000010000"
                autoComplete="off"
                aria-describedby={recipient ? 'recipient-confirmed' : undefined}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              />
              <Button type="button" variant="outline" onClick={() => void findRecipient()} disabled={!recipientWalletNumber.trim()} className="rounded-xl border-slate-200 px-4 text-slate-700">{t('searchButton')}</Button>
            </div>
            {recipient && (
              <div id="recipient-confirmed" className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="rounded-xl bg-white p-2 text-emerald-700"><UserRound className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-emerald-950">{recipient.cardHolderName}</p>
                  <p className="mt-0.5 text-sm text-emerald-800">{recipient.role} · <span className="font-mono">{formatAccountNumber(recipient.walletNumber)}</span></p>
                </div>
                <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-700" />
              </div>
            )}
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">{t('paymentMode')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="tablist" aria-label={t('paymentMode')}>
                {([
                  { mode: 'CARD', label: t('card'), icon: CreditCard },
                  { mode: 'QR', label: t('qrCode'), icon: QrCode },
                  { mode: 'BANK_TRANSFER', label: t('bankTransfer'), icon: Building2 },
                ] as const).map(({ mode, label, icon: ModeIcon }) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={paymentMode === mode}
                    onClick={() => {
                      setPaymentMode(mode)
                      setCardExpiry('')
                      setCardCvv('')
                      setShowCardCvv(false)
                      setError(null)
                    }}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-teal-500/15 ${paymentMode === mode ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <ModeIcon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="payment-currency">
                  {t('paymentCurrency')}
                </label>
                <select
                  id="payment-currency"
                  value={paymentCurrency}
                  onChange={(event) => {
                    setPaymentCurrency(event.target.value as PaymentCurrency)
                    setPaymentQuote(null)
                    setLoadingQuote(false)
                    setError(null)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                >
                  <option value="MGA">{t('mga')}</option>
                  <option value="EUR">{t('eur')}</option>
                  <option value="USD">{t('usd')}</option>
                  <option value="XOF">{t('xof')}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="amount">
                  {t('amountLabel')} ({getCurrencySymbol(paymentCurrency)})
                  <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                </label>
                <input id="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => {
                  setAmount(event.target.value)
                  setPaymentQuote(null)
                  setLoadingQuote(false)
                  setError(null)
                }} placeholder={`0.00 ${paymentCurrency}`} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" />
              </div>
            </div>
            {paymentMode === 'CARD' && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="card-expiry">
                  {t('cardExpiry')}
                  <input
                    id="card-expiry"
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value.replace(/[^\d/]/g, '').slice(0, 5))}
                    placeholder="MM/AA"
                    maxLength={5}
                    autoComplete="off"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />
                </label>
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="card-cvv">{t('cvv')}</label>
                  <div className="relative mt-1">
                  <input
                    id="card-cvv"
                    type={showCardCvv ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    value={cardCvv}
                    onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 font-mono text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />
                    <button type="button" onClick={() => setShowCardCvv((visible) => !visible)} aria-label={t(showCardCvv ? 'hideSensitiveData' : 'showSensitiveData')} title={t(showCardCvv ? 'hideSensitiveData' : 'showSensitiveData')} className="absolute inset-y-0 right-2 inline-flex items-center rounded-lg px-2 text-slate-600 hover:bg-white">
                      {showCardCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{t('dynamicCvv', { code: showDynamicCvv ? dynamicCvv : '•••' })}</span>
                    <button type="button" onClick={() => setShowDynamicCvv((visible) => !visible)} aria-label={t(showDynamicCvv ? 'hideSensitiveData' : 'showSensitiveData')} title={t(showDynamicCvv ? 'hideSensitiveData' : 'showSensitiveData')} className="inline-flex shrink-0 items-center gap-1 rounded-lg p-1 text-slate-700 hover:bg-slate-100">
                      {showDynamicCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {t('dynamicCvvNotice')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {currentQuote && (
              <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5 text-slate-800" aria-live="polite">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><CreditCard className="h-4 w-4 text-teal-700" />{t('paymentFeePreview')}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span>{t('transactionAmount')}</span>
                    <strong>{formatMoney(currentQuote.amount, currentQuote.currency, currentQuote.currency)}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>{t('transactionFee')}</span>
                    <strong>{formatMoney(currentQuote.feeAmount, currentQuote.currency, currentQuote.currency)}</strong>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-teal-200 pt-3 text-base">
                    <span>{t('transactionTotal')}</span>
                    <strong>{formatMoney(currentQuote.totalAmount, currentQuote.currency, currentQuote.currency)}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>{t('walletDebitAmount')}</span>
                    <strong>{formatMoney(currentQuote.walletDebitAmount, currentQuote.walletCurrency, currentQuote.walletCurrency)}</strong>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{t('sandboxExchangeRateNotice')}</p>
              </div>
            )}
            {loadingQuote && <p className="mt-2 flex items-center gap-2 text-sm text-slate-500" aria-live="polite"><span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />{t('calculatingFee')}</p>}
            {paymentMode === 'BANK_TRANSFER' && (
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="flex justify-between gap-3"><span className="text-slate-500">{t('beneficiary')}</span><strong className="text-right text-slate-900">{recipient?.cardHolderName ?? '—'}</strong></p>
                <p className="flex justify-between gap-3"><span className="text-slate-500">{t('bankAccount')}</span><strong className="font-mono text-slate-900">{recipient ? formatAccountNumber(recipient.walletNumber) : '—'}</strong></p>
                <p className="flex justify-between gap-3"><span className="text-slate-500">{t('transactionAmount')}</span><strong className="text-slate-900">{amount ? formatMoney(Number(amount), paymentCurrency, paymentCurrency) : '—'}</strong></p>
                {currentQuote && (
                  <>
                    <p className="flex justify-between gap-3"><span className="text-slate-500">{t('transactionFee')}</span><strong className="text-slate-900">{formatMoney(currentQuote.feeAmount, currentQuote.currency, currentQuote.currency)}</strong></p>
                    <p className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-base"><span className="font-semibold text-slate-700">{t('transactionTotal')}</span><strong className="text-teal-800">{formatMoney(currentQuote.totalAmount, currentQuote.currency, currentQuote.currency)}</strong></p>
                  </>
                )}
              </div>
            )}
            <Button type="submit" className="mt-6 w-full rounded-2xl py-3 text-base" disabled={!recipient || submitting || loadingQuote || !Number.isFinite(Number(amount)) || Number(amount) < 0.01} isLoading={submitting}>{t('payNow')}</Button>
            </div>
          </form>
        </div>

         <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
           <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
             <div>
               <h2 className="text-lg font-bold text-slate-900">{t('transactionHistory')}</h2>
               <p className="mt-1 text-sm text-slate-500">{t('viewLastTransactions')}</p>
             </div>
             <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl border-slate-200 text-slate-700">
               <Printer className="h-4 w-4" /> {t('print')}
             </Button>
           </div>
           {loading ? <p className="p-6 text-sm text-slate-500">{t('loading')}</p> : history.length === 0 ? <p className="p-6 text-sm text-slate-500">{t('noTransactions')}</p> : (
             <div className="space-y-3 p-4 sm:p-6">
               {visibleHistory.map((transaction) => {
                 const outgoing = transaction.direction === 'OUTGOING'
                 const statusTone = transaction.status === 'COMPLETED'
                   ? 'bg-emerald-50 text-emerald-700'
                   : transaction.status === 'FAILED'
                     ? 'bg-rose-50 text-rose-700'
                     : 'bg-amber-50 text-amber-700'
                 return (
                   <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50/70">
                     <div className="flex items-center gap-3">
                       <div className={`rounded-xl p-2.5 ${outgoing ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                         {outgoing ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-slate-900">{transaction.channel} · {transaction.externalReference || `#${transaction.id}`}</p>
                         <p className="mt-1 text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString(locale)}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-semibold text-slate-900">{outgoing ? '-' : '+'}{formatMoney(
                         outgoing && Number(transaction.totalAmount) > 0
                           ? Number(transaction.totalAmount)
                           : !outgoing && Number(transaction.metadata?.recipientCreditAmount) > 0
                             ? Number(transaction.metadata?.recipientCreditAmount)
                             : Number(transaction.amount),
                         !outgoing && transaction.metadata?.recipientCurrency
                           ? transaction.metadata.recipientCurrency
                           : transaction.currency,
                       )}</p>
                       {outgoing && <p className="mt-0.5 text-xs text-slate-500">{t('transactionFee')}: {formatMoney(Number(transaction.feeAmount ?? 0), transaction.currency)}</p>}
                       <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}>{statusLabel[transaction.status]}</span>
                     </div>
                   </div>
                 )
               })}
             </div>
           )}
           {history.length > 0 && (
             <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 p-4">
               <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage === 1}>Précédent</Button>
               {Array.from({ length: historyTotalPages }, (_, index) => index + 1).map((page) => (
                 <Button key={page} type="button" variant={page === historyPage ? 'primary' : 'outline'} size="sm" onClick={() => setHistoryPage(page)}>{page}</Button>
               ))}
               <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))} disabled={historyPage === historyTotalPages}>Suivant</Button>
             </div>
           )}
         </section>
       </div>
     </div>
   )
 }
