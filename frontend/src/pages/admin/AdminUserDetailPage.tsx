import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, User as UserIcon, Wallet, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { kycService } from '../../services/kyc.service'
import { kybService } from '../../services/kyb.service'
import type { User, KycDocument, KybDocument } from '../../models/User.model'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'
import { AnalysisResult, type DocumentAnalysis } from '../../components/common/AnalysisResult'
import { TrustScorePanel, type TrustScoreData } from '../../components/common/TrustScorePanel'

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
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
      setError(err instanceof Error ? err.message : 'Impossible de recalculer le Trust Score')
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation')
    }
  }

  const handleKybReview = async (docId: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      await adminService.reviewKyb(docId, status, rejectionReason)
      setKybDocs((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, status, rejectionReason } : doc)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation')
    }
  }

  if (loading) return <FullPageLoader />

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-dark-400">
        Utilisateur non trouvé
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/users')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-lg">
              {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-50">{selectedUser.firstName} {selectedUser.lastName}</h1>
              <p className="text-sm text-dark-400">{selectedUser.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <TrustScorePanel score={trustScore} onRecalculate={recalculateTrustScore} loading={recalculating} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <UserIcon className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Profil</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-400">Prénom</p>
                  <p className="text-sm text-dark-100">{selectedUser.firstName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Nom</p>
                  <p className="text-sm text-dark-100">{selectedUser.lastName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Email</p>
                  <p className="text-sm text-dark-100">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Téléphone</p>
                  <p className="text-sm text-dark-100">{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">CIN</p>
                  <p className="text-sm text-dark-100">{selectedUser.cin || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Rôle</p>
                  <p className="text-sm text-dark-100">{selectedUser.role}</p>
                </div>
              </div>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Portefeuille</h2>
              </div>
              {selectedUser.wallet ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-dark-400">Numéro</p>
                    <p className="text-sm text-dark-100 font-mono">{selectedUser.wallet.walletNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Solde</p>
                    <p className="text-sm text-dark-100">{Number(selectedUser.wallet.balance).toFixed(2)} {selectedUser.wallet.currency || 'EUR'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Statut</p>
                    <p className="text-sm text-dark-100">{selectedUser.wallet.status}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-dark-400">Aucun portefeuille</p>
              )}
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Documents KYC</h2>
              </div>
              {kycDocs.length === 0 ? (
                <p className="text-sm text-dark-400">Aucun document KYC</p>
              ) : (
                <div className="space-y-3">
                  {kycDocs.map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-dark-700 bg-dark-900/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                        <p className="text-sm font-medium text-dark-100">{doc.documentType}</p>
                        <p className="text-xs text-dark-400">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</p>
                        {doc.rejectionReason && <p className="text-xs text-red-400 mt-1">Motif: {doc.rejectionReason}</p>}
                        </div>
                      {doc.status === 'EN_COURS' && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="primary" onClick={() => handleKycReview(doc.id, 'APPROVED')}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Valider
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleKycReview(doc.id, 'REJECTED', 'Document non conforme')}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        doc.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                        doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
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
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-5 w-5 text-primary-500" />
                  <h2 className="text-lg font-semibold text-dark-50">Documents KYB</h2>
                </div>
                {kybDocs.length === 0 ? (
                  <p className="text-sm text-dark-400">Aucun document KYB</p>
                ) : (
                  <div className="space-y-3">
                    {kybDocs.map((doc) => (
                      <div key={doc.id} className="rounded-lg border border-dark-700 bg-dark-900/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                          <p className="text-sm font-medium text-dark-100">{doc.documentType}</p>
                          <p className="text-xs text-dark-400">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</p>
                          {doc.rejectionReason && <p className="text-xs text-red-400 mt-1">Motif: {doc.rejectionReason}</p>}
                          </div>
                        {doc.status === 'EN_COURS' && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="primary" onClick={() => handleKybReview(doc.id, 'APPROVED')}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valider
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleKybReview(doc.id, 'REJECTED', 'Document non conforme')}>
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                          doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}