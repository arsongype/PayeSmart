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

export default function KycPage() {
  const { user } = useAuth()
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
        setError(err instanceof Error ? err.message : 'Impossible de charger les documents')
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
      setError(err instanceof Error ? err.message : 'Impossible de recalculer le Trust Score')
    } finally {
      setRecalculating(false)
    }
  }

  const handleDelete = async (documentId: number) => {
    if (!window.confirm('Supprimer cette demande KYC ?')) return
    try {
      await kycService.deleteDocument(documentId)
      setDocuments((previous) => previous.filter((document) => document.id !== documentId))
      setTrustScore(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer la demande')
    }
  }

  const handleRevalidate = async () => {
    try {
      const { data } = await apiClient.post('/kyc/revalidate')
      localStorage.setItem('user', JSON.stringify(data))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de réactiver le compte')
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setError(null)
    try {
      const documentType = prompt('Type de document (CIN, PASSPORT, ADDRESS_PROOF, PHOTO_ID):') as KycDocument['documentType']
      if (!documentType) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)

      const { data } = await apiClient.post(`/kyc?userId=${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocuments((prev) => [...prev, data])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-dark-400">Chargement...</div>

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-50">Vérification</h1>
          <p className="text-dark-400 mt-1">Choisissez le type de vérification à compléter.</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3" role="tablist" aria-label="Type de vérification">
          <button
            type="button"
            role="tab"
            aria-selected={activeVerification === 'KYC'}
            onClick={() => setActiveVerification('KYC')}
            className={`rounded-lg border px-5 py-3 text-sm font-semibold transition-colors ${
              activeVerification === 'KYC'
                ? 'border-primary-500 bg-primary-600/15 text-primary-300'
                : 'border-dark-700 bg-dark-800 text-dark-400 hover:border-primary-600/50 hover:text-dark-100'
            }`}
          >
            Vérification KYC
          </button>
          {user?.role === 'MERCHANT' && (
            <button
              type="button"
              role="tab"
              aria-selected={activeVerification === 'KYB'}
              onClick={() => setActiveVerification('KYB')}
              className={`rounded-lg border px-5 py-3 text-sm font-semibold transition-colors ${
                activeVerification === 'KYB'
                  ? 'border-primary-500 bg-primary-600/15 text-primary-300'
                  : 'border-dark-700 bg-dark-800 text-dark-400 hover:border-primary-600/50 hover:text-dark-100'
              }`}
            >
              Vérification KYB
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {user?.accountStatus === 'DELETED' && user.reactivationDeadline && new Date(user.reactivationDeadline) > new Date() && (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-300">
            <p className="font-medium">Votre compte est en attente de suppression définitive.</p>
            <p className="mt-1">Réactivez-le avant le {new Date(user.reactivationDeadline).toLocaleDateString('fr-FR')} pour recommencer votre vérification.</p>
            <Button type="button" size="sm" variant="primary" className="mt-3" onClick={handleRevalidate}>
              Réactiver et recommencer la vérification
            </Button>
          </div>
        )}

        <TrustScorePanel score={trustScore} onRecalculate={recalculateTrustScore} loading={recalculating} />

        {activeVerification === 'KYC' && <>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-dark-50 mb-4">Documents requis</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-dark-100">Carte d'identité / Passeport</p>
                  <p className="text-xs text-dark-400">Recto et verso</p>
                </div>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Envoi...' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-dark-50 mb-4">Documents soumis</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-dark-400 text-center py-8">Aucun document soumis</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id}>
                  <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-lg border border-dark-700">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-medium text-dark-100">{doc.documentType}</p>
                      <p className="text-xs text-dark-400">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    doc.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                    doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {doc.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                    {doc.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                    {doc.status}
                  </span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} aria-label="Supprimer la demande KYC">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
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
