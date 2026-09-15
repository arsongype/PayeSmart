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

interface KybPageProps {
  embedded?: boolean
}

export default function KybPage({ embedded = false }: KybPageProps) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<KybDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDocumentTypeRef = useRef<KybDocument['documentType']>('KBIS')
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  const loadDocuments = useCallback(() => {
    if (user) {
      kybService.getDocuments(user.id).then(setDocuments).catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger les documents')
      }).finally(() => setLoading(false))
    }
  }, [user])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (!user) return
    apiClient.get(`/kyc/trust-score/${user.id}`).then(({ data }) => setTrustScore(data)).catch(() => undefined)
  }, [user])

  const recalculateTrustScore = async () => {
    if (!user) return
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
    if (!window.confirm('Supprimer cette demande KYB ?')) return
    try {
      await kybService.deleteDocument(documentId)
      setDocuments((previous) => previous.filter((document) => document.id !== documentId))
      setTrustScore(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer la demande')
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

      const { data } = await apiClient.post('/kyb', formData)
      setDocuments((prev) => [...prev, data])
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Erreur lors de l\'upload KYB')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload KYB')
      }
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-dark-400">Chargement...</div>

  return (
    <div className={embedded ? '' : 'min-h-screen bg-dark-900 p-4 lg:p-8'}>
      <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-50">Vérification KYB</h1>
          <p className="text-dark-400 mt-1">Soumettez les documents de votre entreprise pour devenir marchand vérifié.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!embedded && (
          <TrustScorePanel score={trustScore} onRecalculate={recalculateTrustScore} loading={recalculating} />
        )}

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-dark-50 mb-4">Documents requis</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-dark-100">KBIS / NIF</p>
                  <p className="text-xs text-dark-400">Extrait Kbis ou Numéro d'Identification Fiscale</p>
                </div>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => {
                  pendingDocumentTypeRef.current = 'KBIS'
                  fileInputRef.current?.click()
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Envoi...' : 'Ajouter'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-dark-100">RIB</p>
                  <p className="text-xs text-dark-400">Relevé d'Identité Bancaire</p>
                </div>
              </div>
              <div>
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => {
                  pendingDocumentTypeRef.current = 'RIB'
                  fileInputRef.current?.click()
                }}>
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
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} aria-label="Supprimer la demande KYB">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                  </div>
                  <AnalysisResult analysis={doc.metadata?.analysis as DocumentAnalysis | undefined} onRecalculate={recalculateTrustScore} recalculating={recalculating} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}