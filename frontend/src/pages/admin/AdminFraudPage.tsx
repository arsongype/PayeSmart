import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, ShieldAlert, Search } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import type { FraudAlert, FraudInvestigation, FraudOutcome } from '../../models/FraudAlert.model'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'

const riskStyles: Record<FraudAlert['riskLevel'], string> = {
  low: 'bg-blue-500/10 text-black border border-blue-500/30',
  medium: 'bg-blue-500/10 text-black border border-blue-500/30',
  high: 'bg-blue-500/10 text-black border border-blue-500/30',
  critical: 'bg-blue-500/10 text-black border border-blue-500/30',
}

export default function AdminFraudPage() {
  const locale = useLocale()
  const { t, formatMoney } = useTranslation()
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [investigation, setInvestigation] = useState<FraudInvestigation | null>(null)
  const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null)
  const [loadingDetailsId, setLoadingDetailsId] = useState<number | null>(null)
  const [actionTransactionId, setActionTransactionId] = useState<number | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [fraudOutcome, setFraudOutcome] = useState<FraudOutcome | ''>('')
  const [suspensionReason, setSuspensionReason] = useState('')
  const [includeAllTransactions, setIncludeAllTransactions] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const alertsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(alerts.length / alertsPerPage))
  const visibleAlerts = alerts.slice((currentPage - 1) * alertsPerPage, currentPage * alertsPerPage)
  const pageItems: Array<number | 'ellipsis-start' | 'ellipsis-end'> = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : currentPage <= 3
      ? [1, 2, 3, 4, 'ellipsis-end', totalPages]
      : currentPage >= totalPages - 2
        ? [1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
        : [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages]

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await adminService.getFraudAlerts(includeAllTransactions)
        setAlerts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('cannotLoadFraudAlerts'))
      } finally {
        setLoading(false)
      }
    }

    void loadAlerts()
  }, [includeAllTransactions, t])

  const toggleInvestigation = async (alert: FraudAlert) => {
    if (expandedTransactionId === alert.transactionId) {
      setExpandedTransactionId(null)
      return
    }
    setExpandedTransactionId(alert.transactionId)
    setInvestigation(null)
    setAdminNotes('')
    setFraudOutcome('')
    setSuspensionReason('')
    setLoadingDetailsId(alert.transactionId)
    setError(null)
    setSuccessMessage(null)
    try {
      const details = await adminService.getFraudAlertInvestigation(alert.transactionId)
      setInvestigation(details)
      setFraudOutcome(details.review?.fraudOutcome ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('investigationLoadFailed'))
    } finally {
      setLoadingDetailsId(null)
    }
  }

  const saveReview = async (alert: FraudAlert, status: 'INVESTIGATING' | 'RESOLVED') => {
    setActionTransactionId(alert.transactionId)
    setError(null)
    setSuccessMessage(null)
    try {
      const outcome = status === 'RESOLVED' ? fraudOutcome : undefined
      await adminService.reviewFraudAlert(alert.transactionId, status, adminNotes, outcome || undefined)
      setAlerts((current) => current.map((item) => item.transactionId === alert.transactionId
        ? { ...item, reviewStatus: status, fraudOutcome: outcome || null }
        : item))
      setSuccessMessage(status === 'RESOLVED' ? t('fraudReviewed') : t('investigationProgressSaved'))
      const details = await adminService.getFraudAlertInvestigation(alert.transactionId)
      setInvestigation(details)
      setFraudOutcome(details.review?.fraudOutcome ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('investigationSaveFailed'))
    } finally {
      setActionTransactionId(null)
    }
  }

  const suspendSender = async (alert: FraudAlert) => {
    if (!window.confirm(t('suspendUserConfirm', { name: investigation?.sender.name ?? t('unknownSender') }))) return
    setActionTransactionId(alert.transactionId)
    setError(null)
    setSuccessMessage(null)
    try {
      await adminService.suspendFraudAlertUser(alert.transactionId, adminNotes, suspensionReason)
      setAlerts((current) => current.map((item) => item.transactionId === alert.transactionId
        ? { ...item, reviewStatus: 'INVESTIGATING', fraudOutcome: null }
        : item))
      setSuccessMessage(t('accountSuspended'))
      const details = await adminService.getFraudAlertInvestigation(alert.transactionId)
      setInvestigation(details)
      setFraudOutcome(details.review?.fraudOutcome ?? '')
      setSuspensionReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('investigationSaveFailed'))
    } finally {
      setActionTransactionId(null)
    }
  }

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-black">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-black">{t('fraudAlerts')}</h1>
             <p className="text-sm text-black">{t('fraudMonitoring')}</p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setCurrentPage(1)
            setIncludeAllTransactions((current) => !current)
          }}
        >
          {includeAllTransactions ? t('showFraudAlertsOnly') : t('includeAllTransactions')}
        </Button>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-base text-red-800">
              {error}
            </div>
          )}
          {successMessage && (
            <div role="status" aria-live="polite" className="rounded-2xl border border-green-300 bg-green-50 p-4 text-base text-green-900">
              {successMessage}
            </div>
          )}

        {alerts.length === 0 ? (
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-10 text-center shadow-lg shadow-black/20">
             <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-black" />
            <p className="text-lg font-medium text-black">{t('noFraudAlerts')}</p>
            <p className="mt-2 text-sm text-black">{t('nonCompliantTransactionsAppear')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleAlerts.map((alert) => (
              <div key={alert.id} className="rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-1 text-sm font-medium text-black">
                        {t('transactionReference')} {alert.transactionId}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${riskStyles[alert.riskLevel]}`}>
                        {alert.riskLevel.toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm text-black">
                        <ArrowUpRight className="h-3 w-3" />
                        {alert.channel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm text-black">
                        {alert.reviewStatus === 'RESOLVED'
                          ? t('statusResolved')
                          : alert.reviewStatus === 'INVESTIGATING'
                            ? t('statusInvestigating')
                            : t('statusOpen')}
                      </span>
                    </div>

                    <div className="text-lg font-semibold text-black">
                       {formatMoney(alert.amount, alert.currency)}
                    </div>
                     <p className="mt-1 text-base text-black">
                        {alert.sender?.name ?? t('unknownSender')} → {alert.recipient?.name ?? t('unknownRecipient')}
                      </p>
                  </div>

                  <div className="text-left lg:text-right">
                     <p className="text-sm uppercase tracking-wide text-black">{t('aiScore')}</p>
                     <p className="text-2xl font-bold text-black">{Math.round(alert.riskScore)}</p>
                     <p className="text-sm text-black">
                        {new Date(alert.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                   <p className="text-sm uppercase tracking-wide text-black">{t('mainReason')}</p>
                  <p className="mt-2 text-base text-black">{alert.reason}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant={alert.reviewStatus === 'RESOLVED' ? 'success' : 'outline'}
                    onClick={() => void toggleInvestigation(alert)}
                  >
                    <Search className="h-4 w-4" />
                    {alert.reviewStatus === 'RESOLVED'
                      ? t('fraudReviewed')
                      : expandedTransactionId === alert.transactionId
                        ? t('backToList')
                        : t('investigateFraudAlert')}
                  </Button>
                </div>
                {expandedTransactionId === alert.transactionId && (
                  <div className="mt-5 space-y-5 border-t border-gray-200 pt-5">
                    <h2 className="text-xl font-semibold text-black">{t('investigationDetails')}</h2>
                    {loadingDetailsId === alert.transactionId ? (
                      <p className="text-sm text-black">{t('loading')}</p>
                    ) : investigation ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <section className="rounded-2xl border border-gray-200 bg-white p-4">
                            <h3 className="mb-3 font-semibold text-black">{t('transactionOutcome')}</h3>
                            <dl className="space-y-2 text-sm text-black">
                              <div><dt className="inline font-medium">{t('status')}: </dt><dd className="inline">{investigation.transaction.status}</dd></div>
                              <div><dt className="inline font-medium">{t('transactionFee')}: </dt><dd className="inline">{formatMoney(investigation.transaction.feeAmount, investigation.transaction.currency)}</dd></div>
                              <div><dt className="inline font-medium">{t('totalDebited')}: </dt><dd className="inline">{formatMoney(investigation.transaction.totalAmount, investigation.transaction.currency)}</dd></div>
                              {investigation.transaction.externalReference && (
                                <div><dt className="inline font-medium">{t('transactionReference')}: </dt><dd className="inline">{investigation.transaction.externalReference}</dd></div>
                              )}
                              {investigation.transaction.failureReason && (
                                <div><dt className="font-medium">{t('transactionFailure')}</dt><dd>{investigation.transaction.failureReason}</dd></div>
                              )}
                            </dl>
                          </section>
                          <section className="rounded-2xl border border-gray-200 bg-white p-4">
                            <h3 className="mb-3 font-semibold text-black">{t('accountContext')}</h3>
                            <dl className="space-y-2 text-sm text-black">
                              <div><dt className="inline font-medium">{t('user')}: </dt><dd className="inline">{investigation.sender.name}</dd></div>
                              <div><dt className="inline font-medium">{t('emailLabel')}: </dt><dd className="inline">{investigation.sender.email}</dd></div>
                              <div><dt className="inline font-medium">{t('accountStatusLabel', { status: investigation.sender.accountStatus })}</dt></div>
                              <div><dt className="inline font-medium">{t('kycStatusLabel')}: </dt><dd className="inline">{investigation.sender.kycStatus}</dd></div>
                              <div><dt className="inline font-medium">{t('kybStatusLabel')}: </dt><dd className="inline">{investigation.sender.kybStatus}</dd></div>
                              {investigation.sender.suspensionReason && (
                                <div><dt className="font-medium">{t('suspensionReasonPlaceholder')}</dt><dd>{investigation.sender.suspensionReason}</dd></div>
                              )}
                            </dl>
                          </section>
                        </div>

                        <section className="rounded-2xl border border-gray-200 bg-white p-4">
                          <h3 className="mb-2 font-semibold text-black">{t('aiDecision')}</h3>
                          <p className="text-sm text-black">
                            {investigation.risk.decision} · {investigation.risk.level} · {investigation.risk.score.toFixed(1)}/100
                          </p>
                          {investigation.risk.reasons.length > 0 ? (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-black">
                              {investigation.risk.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-black">{alert.reason}</p>
                          )}
                          {investigation.risk.features ? (
                            <div className="mt-3">
                              <h4 className="font-medium text-black">{t('aiFactors')}</h4>
                              <dl className="mt-1 grid gap-x-4 gap-y-1 text-sm text-black sm:grid-cols-2">
                                {Object.entries(investigation.risk.features)
                                  .filter(([, value]) => value !== null)
                                  .map(([key, value]) => (
                                    <div key={key}>
                                      <dt className="inline font-medium">{key.split('_').join(' ')}: </dt>
                                      <dd className="inline">{String(value)}</dd>
                                    </div>
                                  ))}
                              </dl>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-gray-600">{t('aiEvidenceUnavailable')}</p>
                          )}
                        </section>

                        <section className="rounded-2xl border border-gray-200 bg-white p-4">
                          <h3 className="mb-3 font-semibold text-black">{t('recentTransactions')}</h3>
                          {investigation.recentTransactions.length === 0 ? (
                            <p className="text-sm text-black">{t('noRecentTransactions')}</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[36rem] text-left text-sm text-black">
                                <thead><tr className="border-b border-gray-200">
                                  <th className="py-2 pr-3">#</th>
                                  <th className="py-2 pr-3">{t('date')}</th>
                                  <th className="py-2 pr-3">{t('amount')}</th>
                                  <th className="py-2 pr-3">{t('status')}</th>
                                  <th className="py-2">{t('aiScore')}</th>
                                </tr></thead>
                                <tbody>
                                  {investigation.recentTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-b border-gray-100">
                                      <td className="py-2 pr-3">{t('transactionReference')} {transaction.id}</td>
                                      <td className="py-2 pr-3">{new Date(transaction.createdAt).toLocaleString(locale)}</td>
                                      <td className="py-2 pr-3">{formatMoney(transaction.amount, transaction.currency)}</td>
                                      <td className="py-2 pr-3">{transaction.status}</td>
                                      <td className="py-2">{transaction.riskScore.toFixed(1)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                          {investigation.review?.adminNotes && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                              <h3 className="font-semibold text-black">{t('previousReviewNotes')}</h3>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-black">{investigation.review.adminNotes}</p>
                              {investigation.review.fraudOutcome && (
                                <p className="mt-2 text-sm font-medium text-black">
                                  {t('fraudOutcomeLabel')}: {t(investigation.review.fraudOutcome === 'CONFIRMED_FRAUD' ? 'confirmedFraud' : 'legitimateTransaction')}
                                </p>
                              )}
                              {investigation.review.reviewedAt && (
                                <p className="mt-2 text-xs text-gray-700">
                                  {new Date(investigation.review.reviewedAt).toLocaleString(locale)}
                                </p>
                              )}
                            </div>
                          )}
                          <label className="block font-semibold text-black" htmlFor={`fraud-outcome-${alert.transactionId}`}>
                            {t('fraudOutcomeLabel')}
                          </label>
                          <select
                            id={`fraud-outcome-${alert.transactionId}`}
                            value={fraudOutcome}
                            onChange={(event) => setFraudOutcome(event.target.value as FraudOutcome | '')}
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-black"
                          >
                            <option value="">{t('selectFraudOutcome')}</option>
                            <option value="CONFIRMED_FRAUD">{t('confirmedFraud')}</option>
                            <option value="LEGITIMATE">{t('legitimateTransaction')}</option>
                          </select>
                          <p className="text-sm text-gray-700">{t('fraudOutcomeImpact')}</p>
                          <label className="block font-semibold text-black" htmlFor={`fraud-notes-${alert.transactionId}`}>
                            {t('internalConclusion')}
                          </label>
                          <textarea
                            id={`fraud-notes-${alert.transactionId}`}
                            value={adminNotes}
                            onChange={(event) => setAdminNotes(event.target.value)}
                            rows={3}
                            maxLength={2000}
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-black"
                            placeholder={t('internalConclusionPlaceholder')}
                          />
                          <p className="text-sm text-gray-700">{t('legitimateUserCloseHint')}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => void saveReview(alert, 'INVESTIGATING')}
                              isLoading={actionTransactionId === alert.transactionId}
                              disabled={adminNotes.trim().length < 10 || actionTransactionId !== null}>
                              {t('startInvestigation')}
                            </Button>
                            <Button size="sm" variant="success" onClick={() => void saveReview(alert, 'RESOLVED')}
                              isLoading={actionTransactionId === alert.transactionId}
                              disabled={adminNotes.trim().length < 10 || !fraudOutcome || actionTransactionId !== null}>
                              {t('resolveAfterInvestigation')}
                            </Button>
                          </div>
                          {investigation.sender.role !== 'ADMIN' && investigation.sender.accountStatus !== 'SUSPENDED' && (
                            <div className="space-y-2 border-t border-gray-200 pt-3">
                              <label className="block font-semibold text-black" htmlFor={`suspension-reason-${alert.transactionId}`}>
                                {t('suspendAccount')}
                              </label>
                              <textarea
                                id={`suspension-reason-${alert.transactionId}`}
                                value={suspensionReason}
                                onChange={(event) => setSuspensionReason(event.target.value)}
                                rows={2}
                                maxLength={500}
                                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-black"
                                placeholder={t('suspensionReasonPlaceholder')}
                              />
                              <Button size="sm" variant="danger" onClick={() => void suspendSender(alert)}
                                isLoading={actionTransactionId === alert.transactionId}
                                disabled={adminNotes.trim().length < 10 || suspensionReason.trim().length < 10 || actionTransactionId !== null}>
                                {t('confirmSuspendAccount')}
                              </Button>
                            </div>
                          )}
                        </section>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            {totalPages > 1 && (
              <nav className="flex flex-wrap items-center justify-center gap-2 pt-2" aria-label={t('pagination')}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('previous')}
                </button>
                {pageItems.map((item) => item === 'ellipsis-start' || item === 'ellipsis-end' ? (
                  <span key={item} className="px-1 text-sm text-black" aria-hidden="true">...</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    aria-current={currentPage === item ? 'page' : undefined}
                    className={`min-w-9 rounded-xl border px-3 py-2 text-sm font-medium transition ${currentPage === item ? 'border-primary-500 bg-primary-600 text-black' : 'border-gray-300 bg-white text-black hover:bg-gray-100'}`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
