import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, User as UserIcon, Wallet, FileText, CheckCircle2, XCircle, Ban, Trash2, RotateCcw, Camera, Eye, X } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { kycService } from '../../services/kyc.service'
import { kybService } from '../../services/kyb.service'
import type { User, KycDocument, KybDocument } from '../../models/User.model'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'
import { AnalysisResult, type DocumentAnalysis } from '../../components/common/AnalysisResult'
import { TrustScorePanel, type TrustScoreData } from '../../components/common/TrustScorePanel'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'
import { formatAccountNumber } from '../../utils/formatters'

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const locale = useLocale()
  const { t, formatMoney } = useTranslation()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([])
  const [kybDocs, setKybDocs] = useState<KybDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [documentPreview, setDocumentPreview] = useState<{ url: string; title: string } | null>(null)
  const mountedRef = useRef(false)

  const loadUserDetail = useCallback(async () => {
    if (!id || !mountedRef.current) return
    try {
      const userRes = await adminService.getUserDetail(parseInt(id))
      if (!mountedRef.current) return
      setSelectedUser(userRes)
      const [kycResult, kybResult] = await Promise.allSettled([
        kycService.getDocuments(parseInt(id)),
        kybService.getDocuments(parseInt(id)),
      ])
      if (!mountedRef.current) return
      setKycDocs(kycResult.status === 'fulfilled' ? kycResult.value : [])
      setKybDocs(kybResult.status === 'fulfilled' ? kybResult.value : [])
      const documentError = [kycResult, kybResult].find((result) => result.status === 'rejected')
      setError(
        documentError?.status === 'rejected'
          ? documentError.reason instanceof Error ? documentError.reason.message : t('errorLoading')
          : null,
      )
      const score = await adminService.getTrustScore(parseInt(id)).catch(() => null)
      setTrustScore(score)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [id, t])

  const recalculateTrustScore = async () => {
    if (!id) return
    setRecalculating(true)
    try {
      setTrustScore(await adminService.recalculateTrustScore(parseInt(id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotRecalculateTrustScore'))
    } finally {
      setRecalculating(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadUserDetail()
    }
    return () => {
      mountedRef.current = false
    }
  }, [id, loadUserDetail])

  const handleKycReview = async (docId: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      await adminService.reviewKyc(docId, status, rejectionReason)
      setKycDocs((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, status, rejectionReason } : doc)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorValidation'))
    }
  }

  const handleKybReview = async (docId: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      await adminService.reviewKyb(docId, status, rejectionReason)
      setKybDocs((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, status, rejectionReason } : doc)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorValidation'))
    }
  }

  const openDocumentPreview = (documentUrl: string | undefined, documentType: string) => {
    const url = adminService.assetUrl(documentUrl)
    if (url) setDocumentPreview({ url, title: documentType })
  }

  const handleAvatarUpload = async (file: File) => {
    if (!selectedUser) return
    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profileImageTypeError'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t('profileImageSizeError'))
      return
    }
    setAvatarSaving(true)
    setAvatarError('')
    try {
      const updated = await adminService.uploadUserAvatar(selectedUser.id, file)
      setSelectedUser(updated)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t('avatarUploadError'))
    } finally {
      setAvatarSaving(false)
    }
  }

  const handleClearAvatar = async () => {
    if (!selectedUser) return
    setAvatarSaving(true)
    setAvatarError('')
    try {
      await adminService.clearUserAvatar(selectedUser.id)
      setSelectedUser((prev) => prev ? { ...prev, avatarUrl: null } : prev)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t('avatarUploadError'))
    } finally {
      setAvatarSaving(false)
    }
  }

  const updateAccount = async (action: 'suspend' | 'delete' | 'reactivate' | 'cancelDeletion' | 'permanentDelete') => {
    if (!selectedUser) return
    try {
      if (action === 'suspend') {
        const reason = window.prompt(t('blockReasonPrompt'))
        if (!reason) return
        await adminService.suspendUser(selectedUser.id, reason)
      } else if (action === 'delete') {
        if (!window.confirm(t('deleteAccountConfirm'))) return
        await adminService.deleteUser(selectedUser.id)
      } else if (action === 'reactivate') {
        await adminService.reactivateUser(selectedUser.id)
      } else if (action === 'cancelDeletion') {
        await adminService.cancelDeletion(selectedUser.id)
      } else {
        if (!window.confirm(t('permanentDeleteConfirm'))) return
        await adminService.permanentlyDeleteUser(selectedUser.id)
        navigate('/admin/users')
        return
      }
      await loadUserDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorAccountManagement'))
    }
  }

  if (loading) return <FullPageLoader />

  if (!selectedUser) {
    return (
      <div className="page-enter min-h-screen bg-white flex items-center justify-center text-black">
        {error ?? t('userNotFound')}
      </div>
    )
  }

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Button variant="ghost" onClick={() => navigate('/admin/users')} className="mb-4 rounded-xl border border-gray-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToList')}
          </Button>
          <div className="flex items-center gap-3 mb-2">
            {selectedUser.avatarUrl ? (
              <div className="relative h-12 w-12 rounded-full">
                <img src={adminService.assetUrl(selectedUser.avatarUrl)} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} onError={() => setSelectedUser((prev) => prev ? { ...prev, avatarUrl: null } : prev)} className="h-12 w-12 rounded-full object-cover" />
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/30 opacity-0 hover:opacity-100">
                  <Camera size={16} className="text-white" />
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={avatarSaving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAvatarUpload(file); event.currentTarget.value = '' }} />
                </label>
              </div>
            ) : (
              <div className="relative h-12 w-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 font-medium text-lg text-black">
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </div>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/30 opacity-0 hover:opacity-100">
                  <Camera size={16} className="text-white" />
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={avatarSaving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAvatarUpload(file); event.currentTarget.value = '' }} />
                </label>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-black">{selectedUser.firstName} {selectedUser.lastName}</h1>
              <p className="text-base text-black">{selectedUser.email}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`text-sm px-3 py-1.5 rounded-full border font-medium ${
              selectedUser.accountStatus === 'ACTIVE' ? 'border-green-200 bg-green-50 text-green-800' :
              selectedUser.accountStatus === 'SUSPENDED' ? 'border-blue-200 bg-blue-50 text-blue-800' :
              'border-red-200 bg-red-50 text-red-800'
            }`}>
              {t('accountStatusLabel', { status: selectedUser.accountStatus })}
            </span>
            {selectedUser.reactivationDeadline && (
              <span className="text-sm text-black">
                {t('reactivationUntilDate', { date: new Date(selectedUser.reactivationDeadline).toLocaleDateString(locale) })}
              </span>
            )}
            {selectedUser.accountStatus === 'ACTIVE' && (
              <>
                <Button size="sm" variant="outline" onClick={() => updateAccount('suspend')} className="rounded-xl border border-gray-300">
                  <Ban className="h-3 w-3 mr-1" /> {t('block')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => updateAccount('delete')} className="rounded-xl">
                  <Trash2 className="h-3 w-3 mr-1" /> {t('deleteAccount')}
                </Button>
              </>
            )}
            {selectedUser.accountStatus === 'SUSPENDED' && (
              <Button size="sm" variant="success" onClick={() => updateAccount('reactivate')} className="rounded-xl">
                <RotateCcw className="h-3 w-3 mr-1" /> {t('reactivate')}
              </Button>
            )}
            {selectedUser.accountStatus === 'DELETED' && (
              <>
                {selectedUser.reactivationDeadline && new Date(selectedUser.reactivationDeadline) > new Date() && (
                  <Button size="sm" variant="primary" onClick={() => updateAccount('cancelDeletion')} className="rounded-xl">
                    <RotateCcw className="h-3 w-3 mr-1" /> {t('cancelDeletion')}
                  </Button>
                )}
                {selectedUser.reactivationDeadline && new Date(selectedUser.reactivationDeadline) <= new Date() && (
                  <Button size="sm" variant="danger" onClick={() => updateAccount('permanentDelete')} className="rounded-xl">
                    <Trash2 className="h-3 w-3 mr-1" /> {t('permanentlyDelete')}
                  </Button>
                )}
              </>
            )}
            {selectedUser.avatarUrl && selectedUser.accountStatus !== 'DELETED' && (
              <Button size="sm" variant="outline" onClick={() => void handleClearAvatar()} disabled={avatarSaving} className="rounded-xl border border-gray-300">
                <Trash2 className="h-3 w-3 mr-1" /> {t('removeAvatar')}
              </Button>
            )}
           </div>
         </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-base text-red-800">
              {error}
            </div>
          )}
          {avatarError && (
            <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-base text-red-800">
              {avatarError}
            </div>
          )}

        <TrustScorePanel score={trustScore} onRecalculate={recalculateTrustScore} loading={recalculating} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <UserIcon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('profileInfo')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  [t('firstName'), selectedUser.firstName || '-'],
                  [t('lastName'), selectedUser.lastName || '-'],
                  [t('email'), selectedUser.email || '-'],
                  [t('phone'), selectedUser.phone || '-'],
                  [t('cin'), selectedUser.cin || '-'],
                  [t('role'), selectedUser.role],
                 ].map(([label, value]) => (
                    <div key={label as string} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-sm text-black">{label as string}</p>
                      <p className="mt-1 text-base font-medium text-black">{value as string}</p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <Wallet className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('wallet')}</h2>
              </div>
              {selectedUser.wallet ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    [t('number'), formatAccountNumber(selectedUser.wallet.walletNumber)],
                    [t('balance'), formatMoney(Number(selectedUser.wallet.balance), selectedUser.wallet.currency)],
                    [t('status'), selectedUser.wallet.status],
                   ].map(([label, value]) => (
                    <div key={label as string} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-sm text-black">{label as string}</p>
                      <p className="mt-1 text-base font-medium text-black">{value as string}</p>
                    </div>
                    ))}
                 </div>
                  ) : (
                    <p className="text-sm text-black">{t('noWallet')}</p>
                  )}
            </div>

            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('documentsKYC')}</h2>
              </div>
               {kycDocs.length === 0 ? (
                  <p className="text-sm text-black">{t('noKycDocuments')}</p>
               ) : (
                 <div className="space-y-4">
                   {kycDocs.map((doc) => (
                   <div key={doc.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-medium text-black">{doc.documentType}</p>
                                <p className="text-sm text-black">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(locale) : '-'}</p>
                            {doc.rejectionReason && <p className="text-sm text-black mt-1">{t('rejectionReasonLabel', { reason: doc.rejectionReason })}</p>}
                          </div>
                         <div className="flex flex-wrap items-center gap-2">
                            {doc.documentUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocumentPreview(doc.documentUrl, doc.documentType)}
                                className="rounded-xl border-primary-500 text-black"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t('viewDocument')}
                              </Button>
                            )}
                            {doc.status === 'EN_COURS' && (
                              <>
                               <Button size="sm" variant="success" onClick={() => handleKycReview(doc.id, 'APPROVED')} className="rounded-xl">
                                 <CheckCircle2 className="h-3 w-3 mr-1" />
                                 {t('approve')}
                               </Button>
                               <Button size="sm" variant="danger" onClick={() => handleKycReview(doc.id, 'REJECTED', t('validation'))} className="rounded-xl">
                                 <XCircle className="h-3 w-3 mr-1" />
                                 {t('reject')}
                               </Button>
                             </>
                           )}
                         </div>
                         <span className={`text-sm px-3 py-1.5 rounded-full ${
                           doc.status === 'APPROVED' ? 'bg-green-50 text-green-800 border border-green-200' :
                           doc.status === 'REJECTED' ? 'bg-red-50 text-red-800 border border-red-200' :
                           'bg-blue-500/10 text-black border border-blue-500/30'
                         }`}>
                           {doc.status}
                         </span>
                       </div>
                       <AnalysisResult analysis={doc.metadata?.analysis as DocumentAnalysis | undefined} onRecalculate={recalculateTrustScore} recalculating={recalculating} />
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {selectedUser.role === 'MERCHANT' && (
              <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-black">{t('documentsKYB')}</h2>
                </div>
                {kybDocs.length === 0 ? (
                  <p className="text-sm text-black">{t('noKybDocuments')}</p>
                ) : (
                  <div className="space-y-4">
                    {kybDocs.map((doc) => (
                      <div key={doc.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                         <div>
                            <p className="text-base font-medium text-black">{doc.documentType}</p>
                              <p className="text-sm text-black">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(locale) : '-'}</p>
                              {doc.rejectionReason && <p className="text-sm text-black mt-1">{t('rejectionReasonLabel', { reason: doc.rejectionReason })}</p>}
                          </div>
                           <div className="flex flex-wrap items-center gap-2">
                             {doc.documentUrl && (
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => openDocumentPreview(doc.documentUrl, doc.documentType)}
                                 className="rounded-xl border-primary-500 text-black"
                               >
                                 <Eye className="h-4 w-4 mr-1" />
                                 {t('viewDocument')}
                               </Button>
                             )}
                             {doc.status === 'EN_COURS' && (
                               <>
                                 <Button size="sm" variant="success" onClick={() => handleKybReview(doc.id, 'APPROVED')} className="rounded-xl">
                                   <CheckCircle2 className="h-3 w-3 mr-1" />
                                   {t('approve')}
                                 </Button>
                                 <Button size="sm" variant="danger" onClick={() => handleKybReview(doc.id, 'REJECTED', t('validation'))} className="rounded-xl">
                                   <XCircle className="h-3 w-3 mr-1" />
                                   {t('reject')}
                                 </Button>
                               </>
                             )}
                           </div>
                           <span className={`text-sm px-3 py-1.5 rounded-full ${
                             doc.status === 'APPROVED' ? 'bg-green-50 text-green-800 border border-green-200' :
                             doc.status === 'REJECTED' ? 'bg-red-50 text-red-800 border border-red-200' :
                             'bg-blue-500/10 text-black border border-blue-500/30'
                           }`}>
                             {doc.status}
                           </span>
                        </div>
                        <AnalysisResult
                          analysis={doc.metadata?.analysis as DocumentAnalysis | undefined}
                          status={doc.status}
                          onRecalculate={recalculateTrustScore}
                          recalculating={recalculating}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {documentPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDocumentPreview(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-preview-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 id="document-preview-title" className="text-lg font-semibold text-black">
                {t('viewDocument')} — {documentPreview.title}
              </h2>
              <button
                type="button"
                onClick={() => setDocumentPreview(null)}
                aria-label={t('close')}
                className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            {/\.(png|jpe?g|webp)(?:$|[?#])/i.test(documentPreview.url) ? (
              <div className="overflow-auto bg-gray-100 p-4 text-center">
                <img src={documentPreview.url} alt={documentPreview.title} className="mx-auto max-h-[75vh] max-w-full object-contain" />
              </div>
            ) : documentPreview.url.toLowerCase().includes('.pdf') ? (
              <iframe
                src={documentPreview.url}
                title={documentPreview.title}
                className="min-h-[70vh] w-full flex-1"
              />
            ) : (
              <div className="p-8 text-center">
                <p className="mb-4 text-black">{t('documentPreviewUnavailable')}</p>
                <a
                  href={documentPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-700 underline"
                >
                  {t('viewDocument')}
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
