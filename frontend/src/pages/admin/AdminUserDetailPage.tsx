import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, User as UserIcon, Wallet, FileText, CheckCircle2, XCircle, Ban, Trash2, RotateCcw } from 'lucide-react'
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
  const mountedRef = useRef(false)

  const loadUserDetail = useCallback(async () => {
    if (!id || !mountedRef.current) return
    try {
      const [userRes, kycRes, kybRes] = await Promise.all([
        adminService.getUserDetail(parseInt(id)),
        kycService.getDocuments(parseInt(id)).catch(() => []),
        kybService.getDocuments(parseInt(id)).catch(() => []),
      ])
      if (!mountedRef.current) return
      setSelectedUser(userRes)
      setKycDocs(kycRes)
      setKybDocs(kybRes)
      const score = await adminService.getTrustScore(parseInt(id)).catch(() => null)
      setTrustScore(score)
      setError(null)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [id])

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
        {t('userNotFound')}
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
            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center text-black font-medium text-lg">
              {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-black">{selectedUser.firstName} {selectedUser.lastName}</h1>
              <p className="text-base text-black">{selectedUser.email}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`text-sm px-3 py-1.5 rounded-full border font-medium ${
              selectedUser.accountStatus === 'ACTIVE' ? 'border-emerald-500/30 bg-emerald-500/10 text-black' :
              selectedUser.accountStatus === 'SUSPENDED' ? 'border-amber-500/30 bg-amber-500/10 text-black' :
              'border-red-500/30 bg-red-500/10 text-black'
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
              <Button size="sm" variant="primary" onClick={() => updateAccount('reactivate')} className="rounded-xl">
                <RotateCcw className="h-3 w-3 mr-1" /> {t('reactivate')}
              </Button>
            )}
            {selectedUser.accountStatus === 'DELETED' && (
              <>
                <Button size="sm" variant="primary" onClick={() => updateAccount('cancelDeletion')} className="rounded-xl">
                  <RotateCcw className="h-3 w-3 mr-1" /> {t('cancelDeletion')}
                </Button>
                {selectedUser.reactivationDeadline && new Date(selectedUser.reactivationDeadline) < new Date() && (
                  <Button size="sm" variant="danger" onClick={() => updateAccount('permanentDelete')} className="rounded-xl">
                    <Trash2 className="h-3 w-3 mr-1" /> {t('permanentlyDelete')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-base text-black">
              {error}
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
                    [t('number'), selectedUser.wallet.walletNumber],
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
                         {doc.status === 'EN_COURS' && (
                           <div className="flex items-center gap-2">
                             <Button size="sm" variant="primary" onClick={() => handleKycReview(doc.id, 'APPROVED')} className="rounded-xl">
                               <CheckCircle2 className="h-3 w-3 mr-1" />
                               {t('approve')}
                             </Button>
                             <Button size="sm" variant="danger" onClick={() => handleKycReview(doc.id, 'REJECTED', t('validation'))} className="rounded-xl">
                               <XCircle className="h-3 w-3 mr-1" />
                               {t('reject')}
                             </Button>
                           </div>
                         )}
                         <span className={`text-sm px-3 py-1.5 rounded-full ${
                           doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-black border border-emerald-500/30' :
                           doc.status === 'REJECTED' ? 'bg-red-500/10 text-black border border-red-500/30' :
                           'bg-amber-500/10 text-black border border-amber-500/30'
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
                           {doc.status === 'EN_COURS' && (
                             <div className="flex items-center gap-2">
                               <Button size="sm" variant="primary" onClick={() => handleKybReview(doc.id, 'APPROVED')} className="rounded-xl">
                                 <CheckCircle2 className="h-3 w-3 mr-1" />
                                 {t('approve')}
                               </Button>
                               <Button size="sm" variant="danger" onClick={() => handleKybReview(doc.id, 'REJECTED', t('validation'))} className="rounded-xl">
                                 <XCircle className="h-3 w-3 mr-1" />
                                 {t('reject')}
                               </Button>
                             </div>
                           )}
                           <span className={`text-sm px-3 py-1.5 rounded-full ${
                             doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-black border border-emerald-500/30' :
                             doc.status === 'REJECTED' ? 'bg-red-500/10 text-black border border-red-500/30' :
                             'bg-amber-500/10 text-black border border-amber-500/30'
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
    </div>
  )
}



