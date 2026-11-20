import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Wallet, CreditCard, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { walletService } from '../../services/wallet.service'
import { paymentService } from '../../services/payment.service'
import { FullPageLoader } from '../../components/common/Loader'
import type { Wallet as WalletType } from '../../models/User.model'
import type { PaymentTransaction } from '../../services/payment.service'
import { useTranslation } from '../../utils/i18n'
import { formatAccountNumber, maskAccountNumber } from '../../utils/formatters'
import { CopyableValue } from '../../components/common/CopyableValue'
import axios from 'axios'
import { Button } from '../../components/common/Button'
import { withdrawalService, type WithdrawalOptions, type WithdrawalRequest } from '../../services/withdrawal.service'

function getWithdrawalError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
  }
  return error instanceof Error ? error.message : fallback
}

function withdrawalStatusLabel(status: WithdrawalRequest['status'], t: ReturnType<typeof useTranslation>['t']): string {
  if (status === 'PENDING') return t('withdrawalPending')
  if (status === 'APPROVED') return t('withdrawalApproved')
  if (status === 'PAID') return t('withdrawalPaid')
  if (status === 'CANCELLED') return t('withdrawalCancelledStatus')
  return t('withdrawalRejected')
}

export default function WalletPage() {
  const { user } = useAuth()
  const { t, locale, formatMoney } = useTranslation()
  const [showWalletNumber, setShowWalletNumber] = useState(false)
  const [showCardNumber, setShowCardNumber] = useState(false)
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [history, setHistory] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [detailTransaction, setDetailTransaction] = useState<PaymentTransaction | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [withdrawalOptions, setWithdrawalOptions] = useState<WithdrawalOptions | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalRecipient, setWithdrawalRecipient] = useState('')
  const [withdrawalDestination, setWithdrawalDestination] = useState('')
  const [withdrawalBankName, setWithdrawalBankName] = useState('')
  const [withdrawalNote, setWithdrawalNote] = useState('')
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null)
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)
  const historyPageSize = 5
  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize))
  const visibleHistory = history.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
  const loadHistory = async () => {
    try {
      const data = await paymentService.history()
      setHistory(data)
      setHistoryPage(1)
    } catch {
      // history loading failed silently
    }
  }

  useEffect(() => {
    if (user) {
      walletService.getWalletWithEffectiveLimits(user.id).then(setWallet).finally(() => setLoading(false))
      const timeoutId = window.setTimeout(() => void loadHistory(), 0)
      return () => window.clearTimeout(timeoutId)
    }
    return undefined
  }, [user])

  const loadWithdrawals = useCallback(async () => {
    setWithdrawalError(null)
    const [optionsResult, requestsResult] = await Promise.allSettled([
      withdrawalService.getOptions(),
      withdrawalService.listMine(),
    ])

    if (optionsResult.status === 'fulfilled') {
      setWithdrawalOptions(optionsResult.value)
    } else {
      setWithdrawalOptions(null)
      setWithdrawalError(getWithdrawalError(optionsResult.reason, t('withdrawalUnavailable')))
    }

    if (requestsResult.status === 'fulfilled') {
      setWithdrawals(requestsResult.value)
    } else {
      setWithdrawalError(getWithdrawalError(requestsResult.reason, t('withdrawalUnavailable')))
    }
  }, [t])

  useEffect(() => {
    if (!user) return
    const timeoutId = window.setTimeout(() => void loadWithdrawals(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [user, loadWithdrawals])

  const submitWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(withdrawalAmount)
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      setWithdrawalError(t('withdrawalAmountInvalid'))
      return
    }
    setWithdrawalSubmitting(true)
    setWithdrawalError(null)
    setWithdrawalSuccess(null)
    try {
      await withdrawalService.create({
        amount,
        method: 'BANK_TRANSFER',
        recipientName: withdrawalRecipient,
        destinationAccount: withdrawalDestination,
        bankName: withdrawalBankName,
        ...(withdrawalNote.trim() ? { note: withdrawalNote.trim() } : {}),
      })
      setWithdrawalAmount('')
      setWithdrawalRecipient('')
      setWithdrawalDestination('')
      setWithdrawalBankName('')
      setWithdrawalNote('')
      setWithdrawalSuccess(t('withdrawalSubmitted'))
      setWithdrawalModalOpen(false)
      await loadWithdrawals()
      if (user) setWallet(await walletService.getWalletWithEffectiveLimits(user.id))
    } catch (error) {
      setWithdrawalError(getWithdrawalError(error, t('withdrawalUnavailable')))
    } finally {
      setWithdrawalSubmitting(false)
    }
  }

  const cancelWithdrawal = async (id: number) => {
    setWithdrawalError(null)
    setWithdrawalSuccess(null)
    try {
      await withdrawalService.cancel(id)
      setWithdrawalSuccess(t('withdrawalCancelled'))
      await loadWithdrawals()
      if (user) setWallet(await walletService.getWalletWithEffectiveLimits(user.id))
    } catch (error) {
      setWithdrawalError(getWithdrawalError(error, t('withdrawalUnavailable')))
    }
  }

  const openDetail = async (transaction: PaymentTransaction) => {
    setDetailLoading(true)
    setDetailTransaction(transaction)
    try {
      const updated = await paymentService.get(transaction.id)
      setDetailTransaction(updated)
    } catch {
      // keep basic transaction data if detail fetch fails
    } finally {
      setDetailLoading(false)
    }
  }

  const downloadReceipt = async (transaction: PaymentTransaction) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFillColor(8, 123, 128)
    doc.roundedRect(12, 12, 186, 30, 4, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.text(t('receiptTitle'), 20, 31)
    doc.setTextColor(62, 58, 54)
    doc.setFontSize(10)
    doc.text(t('receiptReference', { ref: transaction.externalReference ?? String(transaction.id) }), 16, 54)
    doc.text(t('receiptDate', { date: new Date(transaction.createdAt).toLocaleString() }), 16, 62)
    doc.setDrawColor(220, 218, 212)
    doc.line(16, 68, 194, 68)
    doc.setFontSize(12)
    doc.text(t('receiptAmount', { amount: Number(transaction.amount).toFixed(2), currency: transaction.currency }), 20, 84)
    doc.text(t('receiptFee', { amount: Number(transaction.feeAmount ?? 0).toFixed(2), currency: transaction.currency }), 20, 96)
    doc.setFillColor(232, 247, 246)
    doc.roundedRect(16, 106, 178, 20, 3, 3, 'F')
    doc.setFontSize(14)
    doc.setTextColor(8, 123, 128)
    doc.text(t('receiptTotal', { amount: Number(transaction.totalAmount ?? transaction.amount).toFixed(2), currency: transaction.currency }), 22, 119)
    doc.setTextColor(62, 58, 54)
    doc.setFontSize(11)
    doc.text(t('receiptChannel', { channel: transaction.channel }), 20, 145)
    doc.text(t('receiptStatus', { status: transaction.status }), 20, 155)
    doc.save(`paysmart-recu-${transaction.id}.pdf`)
  }

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-black">{t('myWallet')}</h1>
          <p className="text-lg text-black">{t('viewBalanceLimits')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                <Wallet className="h-5 w-5" />
              </div>
               <p className="text-base font-medium text-black">{t('currentBalance')}</p>
            </div>
            <p className="text-3xl font-bold text-black">{formatMoney(Number(wallet?.balance ?? 0), wallet?.currency)}</p>
          </div>
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-blue-500/10 p-2.5 text-black">
                <TrendingUp className="h-5 w-5" />
              </div>
               <p className="text-base font-medium text-black">{t('dailyLimit')}</p>
            </div>
            <p className="text-3xl font-bold text-black">{formatMoney(Number(wallet?.dailyLimit ?? 0), wallet?.currency)}</p>
          </div>
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-blue-500/10 p-2.5 text-black">
                <CreditCard className="h-5 w-5" />
              </div>
               <p className="text-base font-medium text-black">{t('monthlyLimit')}</p>
            </div>
            <p className="text-3xl font-bold text-black">{formatMoney(Number(wallet?.monthlyLimit ?? 0), wallet?.currency)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <AlertCircle className="h-5 w-5" />
            </div>
              <h2 className="text-xl font-semibold text-black">{t('walletInfo')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
               <p className="text-sm text-black">{t('walletNumber')}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                {wallet?.walletNumber && <CopyableValue
                  value={wallet.walletNumber}
                  displayValue={showWalletNumber ? formatAccountNumber(wallet.walletNumber) : maskAccountNumber(wallet.walletNumber)}
                  label={t('walletNumber')}
                  className="font-mono text-base font-medium text-black"
                />}
                {wallet?.walletNumber && <button type="button" onClick={() => setShowWalletNumber((visible) => !visible)} aria-label={t(showWalletNumber ? 'hideSensitiveData' : 'showSensitiveData')} title={t(showWalletNumber ? 'hideSensitiveData' : 'showSensitiveData')} className="shrink-0 rounded-lg p-2 text-black hover:bg-gray-100">
                  {showWalletNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-black">{t('cardNumber')}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                {wallet?.cardNumber && <CopyableValue
                  value={wallet.cardNumber}
                  displayValue={showCardNumber ? formatAccountNumber(wallet.cardNumber) : maskAccountNumber(wallet.cardNumber)}
                  label={t('cardNumber')}
                  className="font-mono text-base font-medium text-black"
                />}
                {wallet?.cardNumber && <button type="button" onClick={() => setShowCardNumber((visible) => !visible)} aria-label={t(showCardNumber ? 'hideSensitiveData' : 'showSensitiveData')} title={t(showCardNumber ? 'hideSensitiveData' : 'showSensitiveData')} className="shrink-0 rounded-lg p-2 text-black hover:bg-gray-100">
                  {showCardNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
               <p className="text-sm text-black">{t('status')}</p>
              <div className="mt-1">
                <span className={`inline-flex text-sm px-3 py-1.5 rounded-full font-medium ${
                  wallet?.status === 'ACTIVE' ? 'bg-green-50 text-green-800 border border-green-200' :
                  wallet?.status === 'SUSPENDED' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-blue-500/10 text-black border border-blue-500/30'
                }`}>
                  {wallet?.status || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-black">{t('withdrawalRequests')}</h2>
            {withdrawalOptions && <p className="mt-2 text-sm font-medium text-primary-700">{t('withdrawalCountry')}: {withdrawalOptions.countryCode}</p>}
          </div>
          {withdrawalError && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{withdrawalError}</p>}
          {withdrawalSuccess && <p role="status" className="mb-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800">{withdrawalSuccess}</p>}

          <Button type="button" variant="success" onClick={() => { setWithdrawalError(null); setWithdrawalModalOpen(true) }}>
            {t('requestWithdrawal')}
          </Button>

          <div className="mt-5 space-y-3">
            {withdrawals.length === 0 ? (
              <p className="text-sm text-gray-700">{t('noWithdrawalRequests')}</p>
            ) : withdrawals.map((request) => (
              <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                <div>
                  <p className="font-semibold text-black">{formatMoney(request.amount, request.currency)} · {request.method}</p>
                  <p className="text-sm text-gray-700">{request.destinationSummary} · {new Date(request.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR')}</p>
                  {request.adminNote && <p className="mt-1 text-sm text-red-700">{request.adminNote}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${request.status === 'PAID' ? 'border-green-200 bg-green-50 text-green-800' : request.status === 'REJECTED' || request.status === 'CANCELLED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>{withdrawalStatusLabel(request.status, t)}</span>
                  {request.status === 'PENDING' && <Button type="button" variant="danger" size="sm" onClick={() => void cancelWithdrawal(request.id)}>{t('cancelWithdrawal')}</Button>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {withdrawalModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !withdrawalSubmitting) setWithdrawalModalOpen(false) }}>
            <section role="dialog" aria-modal="true" aria-labelledby="withdrawal-modal-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-300 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="withdrawal-modal-title" className="text-xl font-semibold text-black">{t('requestWithdrawal')} · {t('bankName')}</h2>
                </div>
                <button type="button" onClick={() => setWithdrawalModalOpen(false)} disabled={withdrawalSubmitting} aria-label={t('closeMenu')} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {withdrawalError && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{withdrawalError}</p>}
              <form onSubmit={submitWithdrawal} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-black">
                {t('amount')}
                <input required type="number" min="0.01" step="0.01" max={Number(wallet?.balance ?? 0)} value={withdrawalAmount} onChange={(event) => setWithdrawalAmount(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-medium text-black">
                {t('withdrawalMethod')}
                <input readOnly value="Orange Money" className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-medium text-black">
                {t('withdrawalRecipient')}
                <input required minLength={2} maxLength={120} value={withdrawalRecipient} onChange={(event) => setWithdrawalRecipient(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-medium text-black">
                {t('withdrawalDestination')}
                <input required minLength={5} maxLength={200} value={withdrawalDestination} onChange={(event) => setWithdrawalDestination(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-medium text-black">
                {t('withdrawalBankName')}
                <input required minLength={2} maxLength={120} value={withdrawalBankName} onChange={(event) => setWithdrawalBankName(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-medium text-black sm:col-span-2">
                {t('withdrawalNote')}
                <textarea maxLength={500} value={withdrawalNote} onChange={(event) => setWithdrawalNote(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2" rows={2} />
              </label>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button type="button" variant="secondary" disabled={withdrawalSubmitting} onClick={() => setWithdrawalModalOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" variant="success" isLoading={withdrawalSubmitting} disabled={!withdrawalOptions || Number(withdrawalAmount) > Number(wallet?.balance ?? 0)}>
                  {t('requestWithdrawal')}
                </Button>
              </div>
              </form>
            </section>
          </div>
        )}

        <section className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black">{t('transactionHistory')}</h2>
              <p className="mt-1 text-base text-black">{t('viewLastTransactions')}</p>
            </div>
            <button type="button" onClick={() => void loadHistory()} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100">
              {t('refresh')}
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-base text-black">{t('noTransactions')}</p>
          ) : (
            <div className="space-y-3">
              {visibleHistory.map((transaction) => {
                const outgoing = transaction.direction === 'OUTGOING'
                const walletAmount = outgoing
                  ? Number(transaction.metadata?.senderDebitAmount ?? transaction.totalAmount ?? transaction.amount)
                  : Number(transaction.metadata?.recipientCreditAmount ?? transaction.amount)
                const walletCurrency = outgoing
                  ? transaction.metadata?.senderCurrency ?? transaction.currency
                  : transaction.metadata?.recipientCurrency ?? transaction.currency
                return (
                  <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-gray-50 p-4 transition hover:border-gray-400">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2 ${outgoing ? 'bg-blue-500/10 text-black' : 'bg-blue-500/10 text-black'}`}>
                        {outgoing ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-base font-medium text-black">{transaction.channel} · {t('transactionReference')} {transaction.externalReference || transaction.id}</p>
                          <p className="text-sm text-black">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-black">{outgoing ? '-' : '+'}{formatMoney(walletAmount, walletCurrency)}</p>
                        <p className={`text-sm ${transaction.status === 'COMPLETED' ? 'text-black' : transaction.status === 'FAILED' ? 'text-black' : 'text-black'}`}>{transaction.status}</p>
                      </div>
                      <button type="button" onClick={() => openDetail(transaction)} className="rounded-xl border border-gray-300 bg-white p-2 text-black hover:bg-gray-100">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage === 1} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">Précédent</button>
              {Array.from({ length: historyTotalPages }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" onClick={() => setHistoryPage(page)} className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${page === historyPage ? 'border-primary-500 bg-primary-500 text-black' : 'border-gray-300 bg-white text-black'}`}>{page}</button>
              ))}
              <button type="button" onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))} disabled={historyPage === historyTotalPages} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">Suivant</button>
            </div>
          )}
        </section>
      </div>

      {detailTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black">{t('transactionDetails')}</h3>
              <button type="button" onClick={() => setDetailTransaction(null)} className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100">
                {t('closeMenu')}
              </button>
            </div>
            {detailLoading && <p className="text-base text-black">{t('loading')}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('transactionReference')}</p>
                <p className="mt-1 text-base font-medium text-black font-mono">{detailTransaction.externalReference || detailTransaction.id}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('channel')}</p>
                <p className="mt-1 text-base font-medium text-black">{detailTransaction.channel}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('status')}</p>
                <p className="mt-1 text-base font-medium text-black">{detailTransaction.status}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">{t('amount')}</p>
                <p className="mt-1 text-base font-medium text-black">{formatMoney(Number(detailTransaction.amount), detailTransaction.currency)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">Date</p>
                <p className="mt-1 text-base font-medium text-black">{new Date(detailTransaction.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-black">Direction</p>
                <p className="mt-1 text-base font-medium text-black">{detailTransaction.direction || '-'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black">Analyse risque / IA</p>
              <div className="mt-2 space-y-2 text-sm text-black">
                <p>Score de risque : {detailTransaction.metadata?.riskScore ?? '-'}</p>
                <p>Niveau : {detailTransaction.metadata?.riskLevel ?? '-'}</p>
                <p>Décision : {detailTransaction.metadata?.riskDecision ?? '-'}</p>
                <p>Raison : {detailTransaction.metadata?.riskReasons?.join(' ') ?? detailTransaction.failureReason ?? '-'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { if (detailTransaction) void downloadReceipt(detailTransaction) }} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100">
                {t('downloadReceipt')}
              </button>
              <button type="button" onClick={() => window.print()} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100">
                {t('print')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
