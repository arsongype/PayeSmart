import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Shield, Wallet, ChevronRight, Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { profileService } from '../../services/profile.service'
import { walletService } from '../../services/wallet.service'
import { kycService } from '../../services/kyc.service'
import { kybService } from '../../services/kyb.service'
import { ROUTES } from '../../utils/constants'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'
import type { Profile, Wallet as WalletType, KycDocument, KybDocument } from '../../models/User.model'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([])
  const [kybDocs, setKybDocs] = useState<KybDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [addressForm, setAddressForm] = useState({ address: '', city: '', country: '', postalCode: '' })
  const mountedRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!user || !mountedRef.current) return
    try {
      const [profileRes, walletRes, kycRes, kybRes] = await Promise.all([
        profileService.getProfile(user.id).catch(() => user.profile ?? null),
        walletService.getWallet(user.id).catch(() => null),
        kycService.getDocuments(user.id).catch(() => []),
        kybService.getDocuments(user.id).catch(() => []),
      ])
      if (!mountedRef.current) return
      setProfile(profileRes)
      setAddressForm({
        address: profileRes?.address ?? '',
        city: profileRes?.city ?? '',
        country: profileRes?.country ?? '',
        postalCode: profileRes?.postalCode ?? '',
      })
      setWallet(walletRes)
      setKycDocs(kycRes)
      setKybDocs(kybRes)
    } catch (err) {
      console.error(err)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [user])

  const saveAddress = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      const updated = await profileService.updateProfile(user.id, addressForm)
      setProfile(updated)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    return () => {
      mountedRef.current = false
    }
  }, [loadData])

  if (loading) return <FullPageLoader />

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-50">Mon Profil</h1>
          <p className="text-dark-400 mt-1">Gérez vos informations personnelles et vos documents</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Informations personnelles</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-400">Prénom</p>
                  <p className="text-sm text-dark-100">{user?.firstName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Nom</p>
                  <p className="text-sm text-dark-100">{user?.lastName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Email</p>
                  <p className="text-sm text-dark-100">{user?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Téléphone</p>
                  <p className="text-sm text-dark-100">{user?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">CIN</p>
                  <p className="text-sm text-dark-100">{user?.cin || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Date de naissance</p>
                  <p className="text-sm text-dark-100">{user?.dateOfBirth || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Adresse</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['Adresse', 'address', '12 rue des Fleurs'],
                  ['Ville', 'city', 'Dakar'],
                  ['Pays', 'country', 'Sénégal'],
                  ['Code postal', 'postalCode', '10000'],
                ].map(([label, key, placeholder]) => (
                  <label key={key} className="text-xs text-dark-400">
                    {label}
                    <input
                      value={addressForm[key as keyof typeof addressForm]}
                      placeholder={placeholder}
                      onChange={(event) => setAddressForm({ ...addressForm, [key]: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-dark-700 bg-dark-900/50 px-3 py-2 text-sm text-dark-100 outline-none focus:border-primary-500"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                {saved && <span className="text-sm text-emerald-400">Adresse enregistrée.</span>}
                <button type="button" onClick={() => void saveAddress()} disabled={saving} className="ml-auto flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50">
                  <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer l’adresse'}
                </button>
              </div>
            </div>

            {user?.role === 'MERCHANT' && (
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-5 w-5 text-primary-500" />
                  <h2 className="text-lg font-semibold text-dark-50">Informations entreprise</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-dark-400">Entreprise</p>
                    <p className="text-sm text-dark-100">{profile?.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">SIREN / NIF</p>
                    <p className="text-sm text-dark-100">{profile?.sirenNif || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Registre de commerce</p>
                    <p className="text-sm text-dark-100">{profile?.tradeRegister || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">RIB</p>
                    <p className="text-sm text-dark-100">{profile?.companyRib || '-'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-dark-400">Adresse entreprise</p>
                    <p className="text-sm text-dark-100">{profile?.companyAddress || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Portefeuille</h2>
              </div>
              {wallet ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-dark-400">Numéro</p>
                    <p className="text-sm text-dark-100 font-mono">{wallet.walletNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Solde</p>
                    <p className="text-2xl font-bold text-dark-50">{Number(wallet.balance).toFixed(2)} {wallet.currency || 'EUR'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-400">Statut</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                      {wallet.status}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-dark-400">Aucun portefeuille</p>
              )}
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-dark-50">Vérification</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">KYC</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                    {user?.kycStatus || 'NON_VERIFIE'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">Documents KYC</span>
                  <span className="text-xs text-dark-300">{kycDocs.length}</span>
                </div>
                {user?.role === 'MERCHANT' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-400">KYB</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                        {user?.kybStatus || 'NON_VERIFIE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-400">Documents KYB</span>
                      <span className="text-xs text-dark-300">{kybDocs.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Button className="w-full" onClick={() => window.location.href = ROUTES.KYC}>
              <Shield className="h-4 w-4 mr-2" />
              Compléter la vérification
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}