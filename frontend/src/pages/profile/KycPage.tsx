import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../config/axios.config'
import { kycService } from '../../services/kyc.service'
import type { KycDocument } from '../../models/User.model'
import { Button } from '../../components/common/Button'
import { AnalysisResult, type DocumentAnalysis } from '../../components/common/AnalysisResult'
import { TrustScorePanel, type TrustScoreData } from '../../components/common/TrustScorePanel'
import KybPage from './KybPage'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'

export default function KycPage() {
  const { user } = useAuth()
  const locale = useLocale()
  const { t } = useTranslation()
  const [activeVerification, setActiveVerification] = useState<'KYC' | 'KYB'>('KYC')
  const [documents, setDocuments] = useState<KycDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = useCallback(() => {
    if (user?.id) {
      kycService.getDocuments(user.id).then(setDocuments).catch((err) => {
        setError(err instanceof Error ? err.message : t('cannotLoadDocuments'))
      }).finally(() => setLoading(false))
    }
  }, [user])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (!user?.id) return
    apiClient.get(`/kyc/trust-score/${user.id}`).then(({ data }) => setTrustScore(data)).catch(() => undefined)
  }, [user])

  const recalculateTrustScore = async () => {
    if (!user?.id) return
    setRecalculating(true)
    try {
      const { data } = await apiClient.post(`/kyc/trust-score/${user.id}/recalculate`)
      setTrustScore(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotRecalculateTrustScore'))
    } finally {
      setRecalculating(false)
    }
  }

  const handleDelete = async (documentId: number) => {
    if (!window.confirm(t('deleteKycRequest'))) return
    try {
      await kycService.deleteDocument(documentId)
      setDocuments((previous) => previous.filter((document) => document.id !== documentId))
      setTrustScore(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotDeleteRequest'))
    }
  }

  const handleRevalidate = async () => {
    try {
      const { data } = await apiClient.post('/kyc/revalidate')
      localStorage.setItem('user', JSON.stringify(data))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotReactivateAccount'))
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setError(null)
    try {
      const documentType = prompt(t('documentTypePrompt')) as KycDocument['documentType']
      if (!documentType) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)

      const { data } = await apiClient.post(`/kyc?userId=${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocuments((prev) => [...prev, data])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadError'))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  if (loading) return <div className="page-enter min-h-screen bg-white flex items-center justify-center text-black">{t('loading')}</div>

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-black">{t('verification')}</h1>
          <p className="text-lg text-black">{t('chooseVerificationType')}</p>
        </div>

        <div className="flex flex-wrap gap-3" role="tablist" aria-label={t('verificationType')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeVerification === 'KYC'}
            onClick={() => setActiveVerification('KYC')}
            className={`rounded-2xl border px-6 py-3 text-sm font-semibold transition-colors ${
              activeVerification === 'KYC'
                ? 'border-primary-500 bg-primary-600/15 text-black'
                   : 'border-gray-300 bg-gray-50 text-black hover:border-primary-600/50 hover:text-black'
            }`}
          >
            {t('kycVerification')}
          </button>
          {user?.role === 'MERCHANT' && (
            <button
              type="button"
              role="tab"
              aria-selected={activeVerification === 'KYB'}
              onClick={() => setActiveVerification('KYB')}
            className={`rounded-2xl border px-6 py-3 text-base font-semibold transition-colors ${
                activeVerification === 'KYB'
                  ? 'border-primary-500 bg-primary-600/15 text-black'
                  : 'border-gray-300 bg-gray-50 text-black hover:border-primary-600/50 hover:text-black'
              }`}
            >
              {t('kybVerification')}
            </button>
          )}
        </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-base text-black">
              {error}
            </div>
          )}

        {user?.accountStatus === 'DELETED' && user.reactivationDeadline && new Date(user.reactivationDeadline) > new Date() && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-base text-black">
            <p className="font-medium">{t('accountDeletionPending')}</p>
            <p className="mt-1">{t('reactivateBeforeDate', { date: new Date(user.reactivationDeadline).toLocaleDateString(locale) })}</p>
            <Button type="button" size="sm" variant="primary" className="mt-3 rounded-xl" onClick={handleRevalidate}>
              {t('reactivateAndRestartVerification')}
            </Button>
          </div>
        )}

        <TrustScorePanel score={trustScore} onRecalculate={recalculateTrustScore} loading={recalculating} />

        {activeVerification === 'KYC' && <>
          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold text-black mb-6">{t('requiredDocuments')}</h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-black">{t('idCardOrPassport')}</p>
                     <p className="text-sm text-black">{t('frontAndBack')}</p>
                  </div>
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                  <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-gray-300">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t('uploading') : t('add')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold text-black mb-6">{t('submittedDocuments')}</h2>
            {documents.length === 0 ? (
               <p className="text-base text-black text-center py-8">{t('noDocuments')}</p>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id}>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-primary-500/10 p-2 text-black">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-base font-medium text-black">{doc.documentType}</p>
                             <p className="text-sm text-black">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(locale) : '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium ${
                            doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-black border border-emerald-500/30' :
                            doc.status === 'REJECTED' ? 'bg-red-500/10 text-black border border-red-500/30' :
                            'bg-amber-500/10 text-black border border-amber-500/30'
                          }`}>
                            {doc.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                            {doc.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                            {doc.status}
                          </span>
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} aria-label={t('deleteKycRequestAria')} className="rounded-xl">
                            <Trash2 className="h-4 w-4 text-black" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <AnalysisResult analysis={doc.metadata?.analysis as DocumentAnalysis | undefined} onRecalculate={recalculateTrustScore} recalculating={recalculating} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>}

        {user?.role === 'MERCHANT' && activeVerification === 'KYB' && <KybPage embedded />}
      </div>
    </div>
  )
}



