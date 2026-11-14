import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'
import { withdrawalService, type AdminWithdrawalRequest } from '../../services/withdrawal.service'

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
  }
  return error instanceof Error ? error.message : fallback
}

export default function AdminWithdrawalsPage() {
  const { t, formatMoney } = useTranslation()
  const [requests, setRequests] = useState<AdminWithdrawalRequest[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setError(null)
    try {
      setRequests(await withdrawalService.listForAdmin())
    } catch (loadError) {
      setError(getErrorMessage(loadError, t('withdrawalUnavailable')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRequests(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadRequests])

  const updateRequest = async (id: number, action: 'approve' | 'reject' | 'paid') => {
    setBusyId(id)
    setError(null)
    setSuccess(null)
    try {
      if (action === 'approve') await withdrawalService.approve(id)
      if (action === 'reject') {
        const note = notes[id]?.trim()
        if (!note || note.length < 3) {
          setError(t('withdrawalReviewNote'))
          return
        }
        await withdrawalService.reject(id, note)
      }
      if (action === 'paid') await withdrawalService.markPaid(id, notes[id]?.trim())
      setSuccess(action === 'reject' ? t('withdrawalRejected') : action === 'paid' ? t('withdrawalPaid') : t('withdrawalApproved'))
      await loadRequests()
    } catch (actionError) {
      setError(getErrorMessage(actionError, t('withdrawalUnavailable')))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">{t('withdrawalQueue')}</h1>
            <p className="mt-1 text-gray-700">{t('withdrawalQueueDescription')}</p>
          </div>
          <Button type="button" variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadRequests()}>
            {t('refresh')}
          </Button>
        </div>

        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{t('manualPayoutNotice')}</p>
        {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {success && <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">{success}</p>}

        <div className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="space-y-4 rounded-2xl border border-gray-300 bg-gray-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-black">#{request.id} · {formatMoney(request.amount, request.currency)} · {request.method}</p>
                  <p className="text-sm text-gray-700">{t('withdrawalUser')}: {request.user ? `${request.user.firstName ?? ''} ${request.user.lastName ?? ''} (${request.user.email})` : `#${request.id}`}</p>
                  <p className="text-sm text-gray-700">{request.countryCode} · {new Date(request.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${request.status === 'PAID' ? 'border-green-200 bg-green-50 text-green-800' : request.status === 'REJECTED' || request.status === 'CANCELLED' ? 'border-red-200 bg-red-50 text-red-800' : request.status === 'APPROVED' ? 'border-blue-300 bg-blue-100 text-blue-900' : 'border-blue-200 bg-white text-blue-800'}`}>
                  {request.status === 'PENDING' ? t('withdrawalPending') : request.status === 'APPROVED' ? t('withdrawalApproved') : request.status === 'PAID' ? t('withdrawalPaid') : request.status === 'CANCELLED' ? t('withdrawalCancelledStatus') : t('withdrawalRejected')}
                </span>
              </div>

              <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm sm:grid-cols-2">
                <p><span className="font-semibold">{t('withdrawalRecipient')}:</span> {request.destination.recipientName}</p>
                <p><span className="font-semibold">{t('withdrawalAccount')}:</span> {request.destination.account}</p>
                {request.destination.bankName && <p><span className="font-semibold">{t('withdrawalBankName')}:</span> {request.destination.bankName}</p>}
                {request.destination.note && <p><span className="font-semibold">{t('withdrawalNote')}:</span> {request.destination.note}</p>}
                {request.adminNote && <p className="text-red-700 sm:col-span-2"><span className="font-semibold">{t('withdrawalReviewNote')}:</span> {request.adminNote}</p>}
              </div>

              {request.status === 'PENDING' || request.status === 'APPROVED' ? (
                <div className="space-y-3">
                  <label className="block space-y-1 text-sm font-medium text-black">
                    {t('withdrawalReviewNote')}
                    <textarea maxLength={500} value={notes[request.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2" rows={2} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {request.status === 'PENDING' && <>
                      <Button type="button" variant="success" isLoading={busyId === request.id} disabled={busyId !== null} onClick={() => void updateRequest(request.id, 'approve')}>{t('approve')}</Button>
                      <Button type="button" variant="danger" isLoading={busyId === request.id} disabled={busyId !== null} onClick={() => void updateRequest(request.id, 'reject')}>{t('reject')}</Button>
                    </>}
                    {request.status === 'APPROVED' && <Button type="button" variant="success" isLoading={busyId === request.id} disabled={busyId !== null} onClick={() => void updateRequest(request.id, 'paid')}>{t('markWithdrawalPaid')}</Button>}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {requests.length === 0 && !error && <p className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-700">{t('noWithdrawalRequests')}</p>}
        </div>
      </div>
    </div>
  )
}
