import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Shield, Wallet, ChevronRight, Save, Camera } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { profileService } from '../../services/profile.service'
import { walletService } from '../../services/wallet.service'
import { kycService } from '../../services/kyc.service'
import { kybService } from '../../services/kyb.service'
import { ROUTES } from '../../utils/constants'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'
import type { Profile, Wallet as WalletType, KycDocument, KybDocument, User } from '../../models/User.model'
import { useTranslation } from '../../utils/i18n'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { t, formatMoney } = useTranslation()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([])
  const [kybDocs, setKybDocs] = useState<KybDocument[]>([])
  const [profileUser, setProfileUser] = useState<User | null>(user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cin: '',
    dateOfBirth: '',
  })
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false)
  const [personalInfoSaved, setPersonalInfoSaved] = useState(false)
  const [personalInfoError, setPersonalInfoError] = useState('')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [addressForm, setAddressForm] = useState({ address: '', city: '', country: '', postalCode: '' })
  const mountedRef = useRef(false)
  const approvedKybData = kybDocs
    .filter((document) => document.status === 'APPROVED' || document.status === 'VERIFIE')
    .map((document) => (document.metadata as { analysis?: { extracted_data?: Record<string, unknown> } } | undefined)?.analysis?.extracted_data)
    .filter((data): data is Record<string, unknown> => Boolean(data))
    .reduce<Record<string, unknown>>((merged, data) => ({ ...merged, ...data }), {})
  const companyName = profile?.companyName || (typeof approvedKybData.company_name === 'string' ? approvedKybData.company_name : '')
  const sirenNif = profile?.sirenNif || (typeof approvedKybData.siren_nif === 'string' ? approvedKybData.siren_nif : '')
  const tradeRegister = profile?.tradeRegister || (typeof approvedKybData.trade_register === 'string' ? approvedKybData.trade_register : '')
  const companyRib = profile?.companyRib || (typeof approvedKybData.iban === 'string' ? approvedKybData.iban : '')
  const companyAddress = profile?.companyAddress || (typeof approvedKybData.address === 'string' ? approvedKybData.address : '')

  const loadData = useCallback(async () => {
    if (!user || !mountedRef.current) return
    try {
      const [userRes, profileRes, walletRes, kycRes, kybRes] = await Promise.all([
        profileService.getMe().catch(() => user),
        profileService.getProfile(user.id).catch(() => user.profile ?? null),
        walletService.getWallet(user.id).catch(() => null),
        kycService.getDocuments(user.id).catch(() => []),
        kybService.getDocuments(user.id).catch(() => []),
      ])
      if (!mountedRef.current) return
      setProfileUser(userRes)
      setPersonalForm({
        firstName: userRes?.firstName ?? '',
        lastName: userRes?.lastName ?? '',
        email: userRes?.email ?? '',
        phone: userRes?.phone ?? '',
        cin: userRes?.cin ?? '',
        dateOfBirth: userRes?.dateOfBirth ?? '',
      })
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

  const savePersonalInfo = async () => {
    if (!user) return
    if (!personalForm.firstName.trim() || !personalForm.lastName.trim() || !personalForm.email.trim()) {
      setPersonalInfoError(t('personalInfoRequired'))
      setPersonalInfoSaved(false)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalForm.email)) {
      setPersonalInfoError(t('invalidEmail'))
      setPersonalInfoSaved(false)
      return
    }

    setSavingPersonalInfo(true)
    setPersonalInfoSaved(false)
    setPersonalInfoError('')
    try {
      const updated = await profileService.updateMe(personalForm)
      setProfileUser(updated)
      setPersonalForm({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        cin: updated.cin ?? '',
        dateOfBirth: updated.dateOfBirth ?? '',
      })
      updateUser(updated)
      setPersonalInfoSaved(true)
    } finally {
      setSavingPersonalInfo(false)
    }
  }

  const uploadAvatar = async (file: File) => {
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
      const updated = await profileService.uploadAvatar(file)
      setProfileUser(updated)
      updateUser(updated)
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : t('profileImageUploadError'))
    } finally {
      setAvatarSaving(false)
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
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-black">{t('myProfile')}</h1>
          <p className="text-lg text-black">{t('managePersonalInfo')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4 rounded-3xl border border-gray-300 bg-gray-50 p-5 shadow-lg shadow-black/20">
              {profileUser?.avatarUrl ? (
                <img src={profileService.assetUrl(profileUser.avatarUrl)} alt={`${profileUser.firstName} ${profileUser.lastName}`} onError={() => { void profileService.clearAvatar(); updateUser({ ...profileUser, avatarUrl: null }); setProfileUser((current) => current ? { ...current, avatarUrl: null } : current) }} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-600 text-xl font-semibold text-black">
                  {`${profileUser?.firstName?.[0] ?? ''}${profileUser?.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-black">{t('profilePhoto')}</p>
                <p className="mt-1 text-xs text-black">{t('profilePhotoHint')}</p>
                {avatarError && <p className="mt-2 text-xs text-red-600">{avatarError}</p>}
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-500">
                <Camera size={16} />
                {avatarSaving ? t('saving') : t('changePhoto')}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={avatarSaving}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadAvatar(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('personalInfo')}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { key: 'firstName', label: t('firstName'), type: 'text', required: true },
                  { key: 'lastName', label: t('lastName'), type: 'text', required: true },
                  { key: 'email', label: t('email'), type: 'email', required: true },
                  { key: 'phone', label: t('phone'), type: 'tel', required: false },
                  { key: 'cin', label: t('cin'), type: 'text', required: false },
                  { key: 'dateOfBirth', label: t('dateOfBirth'), type: 'date', required: false },
                ].map(({ key, label, type, required }) => (
                  <label key={key} className="text-sm text-black">
                    {label}
                    <input
                      type={type}
                      required={required}
                      value={personalForm[key as keyof typeof personalForm]}
                      onChange={(event) => {
                        setPersonalForm({ ...personalForm, [key]: event.target.value })
                        setPersonalInfoError('')
                        setPersonalInfoSaved(false)
                      }}
                      className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base text-black outline-none focus:border-primary-500"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                {personalInfoError && <span className="text-sm text-red-600">{personalInfoError}</span>}
                {personalInfoSaved && !personalInfoError && <span className="text-sm text-black">{t('personalInfoSaved')}</span>}
                <button
                  type="button"
                  onClick={() => void savePersonalInfo()}
                  disabled={savingPersonalInfo}
                  className="ml-auto flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-black hover:bg-primary-500 disabled:opacity-50"
                >
                  <Save size={16} /> {savingPersonalInfo ? t('saving') : t('savePersonalInfo')}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('address')}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  [t('address'), 'address', '12 rue des Fleurs'],
                  [t('city'), 'city', 'Dakar'],
                  [t('country'), 'country', 'Sénégal'],
                  [t('postalCode'), 'postalCode', '10000'],
                ].map(([label, key, placeholder]) => (
                  <label key={key as string} className="text-sm text-black">
                    {label as string}
                    <input
                      value={addressForm[key as keyof typeof addressForm]}
                      placeholder={placeholder as string}
                      onChange={(event) => setAddressForm({ ...addressForm, [key as string]: event.target.value })}
                      className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base text-black outline-none focus:border-primary-500"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                {saved && <span className="text-sm text-black">{t('addressSaved')}</span>}
                <button type="button" onClick={() => void saveAddress()} disabled={saving} className="ml-auto flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-black hover:bg-primary-500 disabled:opacity-50">
                  <Save size={16} /> {saving ? t('saving') : t('saveAddress')}
                </button>
              </div>
            </div>

            {user?.role === 'MERCHANT' && (
              <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-black">{t('companyInfo')}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    [t('company'), companyName || '-'],
                    [t('sirenNif'), sirenNif || '-'],
                    [t('tradeRegister'), tradeRegister || '-'],
                    [t('rib'), companyRib || '-'],
                    [t('companyAddress'), companyAddress || '-'],
                  ].map(([label, value], index) => (
                    <div key={label as string} className={`rounded-2xl border border-gray-200 bg-white p-4 ${index === 4 ? 'sm:col-span-2' : ''}`}>
                      <p className="text-sm text-black">{label as string}</p>
                      <p className="mt-1 text-base font-medium text-black">{value as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <Wallet className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('wallet')}</h2>
              </div>
              {wallet ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                     <p className="text-sm text-black">{t('number')}</p>
                    <p className="text-base font-medium text-black font-mono">{wallet.walletNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                     <p className="text-sm text-black">{t('balance')}</p>
                    <p className="mt-1 text-2xl font-bold text-black">{formatMoney(Number(wallet.balance), wallet.currency)}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                     <span className="text-sm text-black">{t('status')}</span>
                    <span className="text-sm px-3 py-1.5 rounded-full bg-emerald-500/10 text-black border border-emerald-500/30 font-medium">
                      {wallet.status}
                    </span>
                  </div>
                </div>
                 ) : (
                   <p className="text-sm text-black">{t('noWallet')}</p>
                 )}
            </div>

            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-6 shadow-lg shadow-black/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-black">{t('verification')}</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="text-sm text-black">{t('kyc')}</span>
                  <span className="text-sm px-3 py-1.5 rounded-full bg-amber-500/10 text-black border border-amber-500/30 font-medium">
                    {user?.kycStatus || 'NON_VERIFIE'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="text-sm text-black">{t('documentsKYC')}</span>
                  <span className="text-sm font-medium text-black">{kycDocs.length}</span>
                </div>
                {user?.role === 'MERCHANT' && (
                  <>
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                      <span className="text-sm text-black">{t('kyb')}</span>
                      <span className="text-sm px-3 py-1.5 rounded-full bg-amber-500/10 text-black border border-amber-500/30 font-medium">
                        {user?.kybStatus || 'NON_VERIFIE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                      <span className="text-sm text-black">{t('documentsKYB')}</span>
                      <span className="text-sm font-medium text-black">{kybDocs.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Button className="w-full rounded-2xl" onClick={() => window.location.href = ROUTES.KYC}>
              <Shield className="h-4 w-4 mr-2" />
              {t('completeVerification')}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



