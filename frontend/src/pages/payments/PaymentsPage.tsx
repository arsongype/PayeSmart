import { useEffect, useState } from 'react'
import axios from 'axios'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Printer, RefreshCw, Send, UserRound, WandSparkles } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, type PaymentChannel, type PaymentTransaction, type RecipientAccount, type VirtualCard } from '../../services/payment.service'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../utils/i18n'

type PaymentMode = 'MOBILE_MONEY' | 'CARD' | 'QR' | 'BANK_TRANSFER'

function getPaymentErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
  }
  return error instanceof Error ? error.message : fallback
}

const mobileMoneyChannels: Array<{ value: PaymentChannel; label: string }> = [
  { value: 'MVOLA', label: 'MVola' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
]

export default function PaymentsPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { t } = useTranslation()
  const locale = settings.language === 'en' ? 'en-US' : 'fr-FR'
  const [recipientWalletNumber, setRecipientWalletNumber] = useState('')
  const [recipient, setRecipient] = useState<RecipientAccount | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('MOBILE_MONEY')
  const [channel, setChannel] = useState<PaymentChannel>('MVOLA')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [cardToken, setCardToken] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [history, setHistory] = useState<PaymentTransaction[]>([])
  const [card, setCard] = useState<VirtualCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastTransaction, setLastTransaction] = useState<PaymentTransaction | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [confirmingTwoFactor, setConfirmingTwoFactor] = useState(false)

  const statusLabel: Record<PaymentTransaction['status'], string> = {
    PENDING: t('pending'),
    PROCESSING: t('inProgress'),
    COMPLETED: t('completed'),
    FAILED: t('failed'),
  }

  const generateCardToken = () => {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 24)
      : `${Date.now()}${Math.random().toString(36).slice(2, 14)}`
    setCardToken(`tok_test_${randomPart}`)
    setError(null)
  }

  const load = async () => {
    try {
      setLoading(true)
      const [transactions, virtualCard] = await Promise.all([paymentService.history(), paymentService.getVirtualCard()])
      setHistory(transactions)
      setCard(virtualCard)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotLoadPayments'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) void load()
  }, [user?.id])

  const findRecipient = async () => {
    const lookupValue = paymentMode === 'MOBILE_MONEY' ? phoneNumber.trim() : recipientWalletNumber.trim()
    if (!/^\d+$/.test(lookupValue)) {
      setError(paymentMode === 'MOBILE_MONEY' ? t('phoneDigitsOnly') : t('accountDigitsOnly'))
      setRecipient(null)
      return
    }
    try {
      setError(null)
      setRecipient(paymentMode === 'MOBILE_MONEY'
        ? await paymentService.findRecipientByPhone(lookupValue)
        : await paymentService.findRecipient(lookupValue))
    } catch (err) {
      setRecipient(null)
      setError(getPaymentErrorMessage(err, t('recipientNotFound')))
    }
  }

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!recipient || !amount) return
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)
      const transaction = await paymentService.initiate({
        recipientWalletNumber: paymentMode === 'MOBILE_MONEY' ? undefined : recipient.walletNumber,
        amount: Number(amount),
        channel,
        currency: card?.currency || 'EUR',
        phoneNumber: phoneNumber || undefined,
        cardToken: cardToken || undefined,
        bankReference: bankReference || undefined,
      })
      setLastTransaction(transaction)
      setSuccess(t('paymentCreated', { reference: transaction.externalReference ?? `#${transaction.id}`, status: statusLabel[transaction.status] }))
      setAmount('')
      setRecipient(null)
      setRecipientWalletNumber('')
      setPhoneNumber('')
      setCardToken('')
      setBankReference('')
      await load()
      void watchTransaction(transaction.id)
    } catch (err) {
      setError(getPaymentErrorMessage(err, t('cannotInitiatePayment')))
    } finally {
      setSubmitting(false)
    }
  }

  const watchTransaction = async (transactionId: number) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const updated = await paymentService.get(transactionId).catch(() => null)
      if (updated) {
        setLastTransaction(updated)
        if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
          setSuccess(updated.status === 'COMPLETED' ? t('paymentConfirmedLedger') : t('paymentFailed', { reason: updated.failureReason ?? t('unknownRecipient') }))
          await load()
          return
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500))
    }
  }

  const confirmTwoFactor = async () => {
    if (!lastTransaction || !/^\d{6}$/.test(twoFactorCode)) return
    try {
      setConfirmingTwoFactor(true)
      setError(null)
      const updated = await paymentService.confirmTwoFactor(lastTransaction.id, twoFactorCode)
      setLastTransaction(updated)
      setTwoFactorCode('')
      setSuccess(updated.status === 'COMPLETED' ? t('paymentConfirmed2fa') : t('paymentStatus', { status: statusLabel[updated.status] }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalid2faCode'))
    } finally {
      setConfirmingTwoFactor(false)
    }
  }

  const downloadReceipt = async () => {
    if (!lastTransaction) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(t('receiptTitle'), 14, 20)
    doc.setFontSize(12)
    const lines = [
      t('receiptReference', { ref: lastTransaction.externalReference ?? lastTransaction.id }),
      t('receiptAmount', { amount: lastTransaction.amount, currency: lastTransaction.currency }),
      t('receiptChannel', { channel: lastTransaction.channel }),
      t('receiptStatus', { status: statusLabel[lastTransaction.status] }),
      t('receiptDate', { date: new Date(lastTransaction.createdAt).toLocaleString(locale) }),
    ]
    doc.text(lines, 14, 32, { maxWidth: 180 })
    doc.save(`paysmart-recu-${lastTransaction.id}.pdf`)
  }

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">{t('payments')}</h1>
             <p className="mt-1 text-black">{t('sendPayment')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} aria-label={t('refreshPayments')} className="rounded-2xl border border-gray-300">
            <RefreshCw className="h-4 w-4" /> {t('refresh')}
          </Button>
        </div>

        {error && <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-base text-black">{error}</div>}
        {success && <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-base text-green-300">{success}</div>}
        {lastTransaction && (
          <div className="rounded-2xl border border-primary-500/30 bg-primary-500/10 p-5 text-base text-black">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t('transactionStatus', { ref: lastTransaction.externalReference ?? `#${lastTransaction.id}`, status: statusLabel[lastTransaction.status] })}</span>
              <Button type="button" size="sm" variant="outline" onClick={downloadReceipt} className="rounded-xl border border-gray-300"><Printer className="h-4 w-4" /> {t('downloadReceipt')}</Button>
            </div>
            {lastTransaction.metadata?.qrData && <p className="mt-2 font-mono text-sm">{t('qrDataLabel', { data: lastTransaction.metadata.qrData })}</p>}
            {lastTransaction.metadata?.temporaryIban && <p className="mt-2 font-mono text-sm">{t('temporaryIbanLabel', { iban: lastTransaction.metadata.temporaryIban })}</p>}
            {lastTransaction.status === 'PENDING' && lastTransaction.failureReason === 'Vérification 2FA requise avant exécution.' && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-primary-500/20 pt-4">
                <div className="min-w-48 flex-1">
                  <label className="mb-1 block text-xs text-black" htmlFor="two-factor-code">{t('codeReceived')}</label>
                  <input
                    id="two-factor-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-mono text-black outline-none focus:border-primary-300"
                  />
                </div>
                <Button type="button" size="sm" onClick={() => void confirmTwoFactor()} disabled={twoFactorCode.length !== 6 || confirmingTwoFactor} isLoading={confirmingTwoFactor}>
                  {t('confirmPayment')}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submitPayment} className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                <Send className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-black">{t('sendPayment')}</h2>
            </div>
            <label className="mb-2 block text-base font-medium text-black" htmlFor={paymentMode === 'MOBILE_MONEY' ? 'phone-number' : 'recipient-account'}>
              {paymentMode === 'MOBILE_MONEY' ? t('recipientPhoneNumber') : t('recipientAccountNumber')}
            </label>
            <div className="flex gap-2">
              <input
                id={paymentMode === 'MOBILE_MONEY' ? 'phone-number' : 'recipient-account'}
                inputMode="numeric"
                pattern="[0-9]+"
                value={paymentMode === 'MOBILE_MONEY' ? phoneNumber : recipientWalletNumber}
                onChange={(event) => paymentMode === 'MOBILE_MONEY' ? setPhoneNumber(event.target.value.replace(/\D/g, '')) : setRecipientWalletNumber(event.target.value.replace(/\D/g, ''))}
                placeholder={paymentMode === 'MOBILE_MONEY' ? '0340000000' : '000000010000'}
                className="min-w-0 flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-black outline-none focus:border-primary-500"
              />
              <Button type="button" variant="outline" onClick={() => void findRecipient()} className="rounded-xl border border-gray-300">{t('searchButton')}</Button>
            </div>
            {recipient && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-4">
                <UserRound className="h-5 w-5 text-black" />
                <div>
                  <p className="font-semibold text-black">{recipient.cardHolderName}</p>
                  <p className="text-base text-black">{recipient.role} · {recipient.walletNumber}</p>
                </div>
              </div>
            )}
            <div className="mt-5">
              <p className="mb-2 text-base font-medium text-black">{t('paymentMode')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label={t('paymentMode')}>
                {([
                  ['MOBILE_MONEY', t('mobileMoney')],
                  ['CARD', t('card')],
                  ['QR', t('qrCode')],
                  ['BANK_TRANSFER', t('bankTransfer')],
                ] as Array<[PaymentMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={paymentMode === mode}
                    onClick={() => {
                      setPaymentMode(mode)
                      if (mode === 'MOBILE_MONEY') setChannel('MVOLA')
                      if (mode === 'CARD') setChannel('CARD')
                      if (mode === 'QR') setChannel('QR')
                      if (mode === 'BANK_TRANSFER') setChannel('BANK_TRANSFER')
                    }}
                     className={`rounded-xl border px-3 py-2.5 text-base font-semibold transition-colors ${paymentMode === mode ? 'border-primary-500 bg-primary-600/15 text-black' : 'border-gray-300 bg-white text-black hover:border-primary-600/50 hover:text-black'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {paymentMode === 'MOBILE_MONEY' && (
              <div className="mt-4">
                <p className="mb-2 text-base font-medium text-black">{t('mobileMoneyOperator')}</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('mobileMoneyOperator')}>
                  {mobileMoneyChannels.map((item) => (
                     <button key={item.value} type="button" role="radio" aria-checked={channel === item.value} onClick={() => { setChannel(item.value); setError(null) }}                      className={`min-h-14 rounded-xl border px-2 py-3 text-base font-semibold transition-colors ${channel === item.value ? 'border-primary-400 bg-primary-600/20 text-black ring-2 ring-primary-500/40' : 'border-gray-300 bg-white text-black hover:border-primary-500/60 hover:text-black'}`}>
                      <span className="block">{item.label}</span>
                       <span className="mt-1 block text-sm font-normal text-black">{t('selectOperator')}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-black">{t('selectedOperator', { label: mobileMoneyChannels.find((item) => item.value === channel)?.label ?? '' })}</p>
              </div>
            )}
            <div className="mt-5">
              <div>
                <label className="mb-2 block text-base font-medium text-black" htmlFor="amount">{t('amountLabel')}</label>
                <input id="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-black outline-none focus:border-primary-500" />
              </div>
            </div>
            {paymentMode === 'MOBILE_MONEY' && (
              <div className="mt-4">
                <p className="text-base text-black">{t('recipientSearchHelper')}</p>
              </div>
            )}
            {paymentMode === 'CARD' && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-base font-medium text-black" htmlFor="card-token">{t('cardToken')}</label>
                  <Button type="button" size="sm" variant="outline" onClick={generateCardToken} className="rounded-xl border border-gray-300">
                    <WandSparkles className="h-4 w-4" /> {t('generateToken')}
                  </Button>
                </div>
                <input id="card-token" required value={cardToken} onChange={(event) => setCardToken(event.target.value)} placeholder={t('cardToken')} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 font-mono text-sm text-black outline-none focus:border-primary-500" />
                <p className="mt-2 text-base text-black">{t('sandboxToken')}</p>
              </div>
            )}
            {paymentMode === 'QR' && (
              <div className="mt-4 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-4 text-base text-black">
                {t('qrDynamicReady', { wallet: recipient?.walletNumber || t('recipient') })}
              </div>
            )}
            {paymentMode === 'BANK_TRANSFER' && (
              <div className="mt-4 space-y-3 rounded-2xl border border-gray-300 bg-white p-4">
                <p className="text-base text-black">{t('temporaryIbanInfo')}</p>
                <label className="block text-base font-medium text-black" htmlFor="bank-reference">{t('bankReferenceLabel')}</label>
                <input id="bank-reference" value={bankReference} onChange={(event) => setBankReference(event.target.value)} placeholder={t('bankReferencePlaceholder')} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-black outline-none focus:border-primary-500" />
              </div>
            )}
            <Button type="submit" className="mt-6 w-full rounded-2xl" disabled={!recipient || submitting || (paymentMode === 'MOBILE_MONEY' && !mobileMoneyChannels.some((item) => item.value === channel))} isLoading={submitting}>{t('payNow')}</Button>
            <p className="mt-3 text-base text-black">{t('paymentAuthorized')}</p>
          </form>

          <div className="overflow-hidden rounded-3xl border border-gray-300 bg-linear-to-br from-blue-50 via-white to-gray-100 p-6 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <CreditCard className="h-6 w-6 text-black" />
                </div>
                 <div>
                     <p className="text-sm uppercase tracking-[0.25em] text-black">{t('paysmart')}</p>
                     <p className="text-sm font-semibold tracking-[0.2em] text-black">VIRTUAL</p>
                 </div>
               </div>
                   <span className="rounded-full border border-gray-300 bg-white/5 px-3 py-1 text-sm uppercase tracking-[0.2em] text-black">Pay</span>
             </div>

            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-black/10 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-black">{t('senderName')}</p>
                      <p className="mt-1 font-mono text-sm text-black">{card?.walletNumber || '—'}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-200/50 bg-primary-500/20 text-base text-black">→</div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-black/10 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-black">{t('recipientName')}</p>
                      <p className="mt-1 font-mono text-sm text-black">{recipient?.walletNumber || '—'}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-200/50 bg-white/10 text-base text-black">⇄</div>
                </div>
              </div>
            </div>

            <p className="mt-8 font-mono text-xl tracking-[0.35em] text-black">{card?.cardNumber || '•••• •••• •••• ••••'}</p>
            <div className="mt-8 flex items-end justify-between gap-3">
              <div>
                   <p className="text-sm uppercase text-black">{t('cardholder')}</p>
                   <p className="text-base font-semibold text-black">{card?.cardHolderName || user?.email || '-'}</p>
               </div>
               <div className="text-right">
                    <p className="text-sm uppercase text-black">{t('account')}</p>
                    <p className="font-mono text-sm text-black">{card?.walletNumber || '-'}</p>
               </div>
             </div>
           </div>
         </div>

         <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
           <div className="mb-6 flex items-center justify-between">
             <div>
               <h2 className="text-xl font-semibold text-black">{t('transactionHistory')}</h2>
               <p className="mt-1 text-base text-black">{t('viewLastTransactions')}</p>
             </div>
             <Button variant="ghost" size="sm" onClick={() => window.print()} className="rounded-xl border border-gray-300">
               <Printer className="h-4 w-4" /> {t('print')}
             </Button>
           </div>
           {loading ? <p className="text-base text-black">{t('loading')}</p> : history.length === 0 ? <p className="text-base text-black">{t('noTransactions')}</p> : (
             <div className="space-y-3">
               {history.map((transaction) => {
                 const outgoing = transaction.direction === 'OUTGOING'
                 return (
                   <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-gray-50 p-4 transition hover:border-gray-400">
                     <div className="flex items-center gap-3">
                       <div className={`rounded-xl p-2 ${outgoing ? 'bg-red-500/10 text-black' : 'bg-emerald-500/10 text-black'}`}>
                         {outgoing ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                       </div>
                       <div>
                         <p className="text-base font-medium text-black">{transaction.channel} · {transaction.externalReference || `#${transaction.id}`}</p>
                           <p className="text-sm text-black">{new Date(transaction.createdAt).toLocaleString(locale)}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-semibold text-black">{outgoing ? '-' : '+'}{Number(transaction.amount).toFixed(2)} {transaction.currency}</p>
                       <p className={`text-sm ${transaction.status === 'COMPLETED' ? 'text-black' : transaction.status === 'FAILED' ? 'text-black' : 'text-black'}`}>{statusLabel[transaction.status]}</p>
                     </div>
                   </div>
                 )
               })}
             </div>
           )}
         </section>
       </div>
     </div>
   )
 }



