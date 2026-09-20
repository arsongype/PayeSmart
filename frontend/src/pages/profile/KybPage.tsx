import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { Upload, FileText, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../config/axios.config'
import { kybService } from '../../services/kyb.service'
import type { KybDocument } from '../../models/User.model'
import { Button } from '../../components/common/Button'
import { AnalysisResult, type DocumentAnalysis } from '../../components/common/AnalysisResult'
import { TrustScorePanel, type TrustScoreData } from '../../components/common/TrustScorePanel'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../utils/i18n'

interface KybPageProps {
  embedded?: boolean
}

export default function KybPage({ embedded = false }: KybPageProps) {
  const { user } = useAuth()
  const locale = useLocale()
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<KybDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDocumentTypeRef = useRef<KybDocument['documentType']>('KBIS')
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  const loadDocuments = useCallback(() => {
    if (user?.id) {
      kybService.getDocuments(user.id).then(setDocuments).catch((err) => {
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
      await kybService.deleteDocument(documentId)
      setDocuments((previous) => previous.filter((document) => document.id !== documentId))
      setTrustScore(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cannotDeleteRequest'))
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', pendingDocumentTypeRef.current)

      const { data } = await apiClient.post('/kyb', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocuments((prev) => [...prev, data])
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message
        setError(Array.isArray(message) ? message.join(', ') : message ?? t('kybUploadError'))
      } else {
        setError(err instanceof Error ? err.message : t('kybUploadError'))
      }
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  if (loading) return <div className="page-enter min-h-screen bg-white flex items-center justify-center text-black">{t('loading')}</div>

  return (
    <div className={embedded ? 'page-enter space-y-6' : 'page-enter min-h-screen bg-white p-4 lg:p-8'}>
      <div className={embedded ? '' : 'mx-auto max-w-4xl space-y-8'}>
        {!embedded && (
          <div>
            <h1 className="text-3xl font-bold text-black">{t('kybVerification')}</h1>
             <p className="text-lg text-black">{t('submitCompanyDocs')}</p>
          </div>
        )}

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-base text-black">
              {error}
            </div>
          )}

        {!embedded && (
          <TrustScorePanel score={trustScore} onRecalculate={recalculateTrustScore} loading={recalculating} />
        )}

        <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold text-black mb-6">{t('requiredDocuments')}</h2>
            <div className="space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-black">{t('kbis')} / {t('cin')}</p>
                       <p className="text-sm text-black">{t('kbisDescription')}</p>
                    </div>
                  </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                  <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => {
                    pendingDocumentTypeRef.current = 'KBIS'
                    fileInputRef.current?.click()
                  }} className="rounded-xl border border-gray-300">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t('uploading') : t('add')}
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                    <FileText className="h-5 w-5" />
                  </div>
                      <div>
                        <p className="text-base font-medium text-black">{t('rib')}</p>
                         <p className="text-sm text-black">{t('ribDescription')}</p>
                      </div>
                </div>
                <div>
                  <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => {
                    pendingDocumentTypeRef.current = 'RIB'
                    fileInputRef.current?.click()
                  }} className="rounded-xl border border-gray-300">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t('uploading') : t('add')}
                  </Button>
                </div>
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
      </div>
    </div>
  )
}



