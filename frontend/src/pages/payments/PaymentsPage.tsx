import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Printer, RefreshCw, Send, UserRound, WandSparkles } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, type PaymentChannel, type PaymentTransaction, type RecipientAccount, type VirtualCard } from '../../services/payment.service'

type PaymentMode = 'MOBILE_MONEY' | 'CARD' | 'QR' | 'BANK_TRANSFER'

const mobileMoneyChannels: Array<{ value: PaymentChannel; label: string }> = [
  { value: 'MVOLA', label: 'MVola' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
]

const statusLabel: Record<PaymentTransaction['status'], string> = {
  PENDING: 'En attente',
  PROCESSING: 'Traitement',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const [recipientWalletNumber, setRecipientWalletNumber] = useState('')
  const [recipient, setRecipient] = useState<RecipientAccount | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('MOBILE_MONEY')
  const [channel, setChannel] = useState<PaymentChannel>('MVOLA')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [cardToken, setCardToken] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [history, setHistory] = useState<PaymentTransaction[]>([])
  const [card, setCard] = useState<VirtualCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastTransaction, setLastTransaction] = useState<PaymentTransaction | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [confirmingTwoFactor, setConfirmingTwoFactor] = useState(false)

  const generateCardToken = () => {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 24)
      : `${Date.now()}${Math.random().toString(36).slice(2, 14)}`
    setCardToken(`tok_test_${randomPart}`)
    setError(null)
  }

  const load = async () => {
    try {
      setLoading(true)
      const [transactions, virtualCard] = await Promise.all([paymentService.history(), paymentService.getVirtualCard()])
      setHistory(transactions)
      setCard(virtualCard)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les paiements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) void load()
  }, [user?.id])

  const findRecipient = async () => {
    const lookupValue = paymentMode === 'MOBILE_MONEY' ? phoneNumber.trim() : recipientWalletNumber.trim()
    if (!/^\d+$/.test(lookupValue)) {
      setError(paymentMode === 'MOBILE_MONEY' ? 'Le numéro de téléphone doit contenir uniquement des chiffres' : 'Le numéro de compte doit contenir uniquement des chiffres')
      setRecipient(null)
      return
    }
    try {
      setError(null)
      setRecipient(paymentMode === 'MOBILE_MONEY'
        ? await paymentService.findRecipientByPhone(lookupValue)
        : await paymentService.findRecipient(lookupValue))
    } catch (err) {
      setRecipient(null)
      setError(err instanceof Error ? err.message : 'Compte destinataire introuvable')
    }
  }

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!recipient || !amount) return
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)
      const transaction = await paymentService.initiate({
        recipientWalletNumber: paymentMode === 'MOBILE_MONEY' ? undefined : recipient.walletNumber,
        amount: Number(amount),
        channel,
        currency: card?.currency || 'EUR',
        phoneNumber: phoneNumber || undefined,
        cardToken: cardToken || undefined,
        bankReference: bankReference || undefined,
      })
      setLastTransaction(transaction)
      setSuccess(`Paiement ${transaction.externalReference ?? `#${transaction.id}`} créé. Statut : ${statusLabel[transaction.status]}.`)
      setAmount('')
      setRecipient(null)
      setRecipientWalletNumber('')
      setPhoneNumber('')
      setCardToken('')
      setBankReference('')
      await load()
      void watchTransaction(transaction.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’initier le paiement')
    } finally {
      setSubmitting(false)
    }
  }

  const watchTransaction = async (transactionId: number) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const updated = await paymentService.get(transactionId).catch(() => null)
      if (updated) {
        setLastTransaction(updated)
        if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
          setSuccess(updated.status === 'COMPLETED' ? 'Paiement confirmé et enregistré dans le ledger.' : `Paiement échoué : ${updated.failureReason ?? 'raison inconnue'}`)
          await load()
          return
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500))
    }
  }

  const confirmTwoFactor = async () => {
    if (!lastTransaction || !/^\d{6}$/.test(twoFactorCode)) return
    try {
      setConfirmingTwoFactor(true)
      setError(null)
      const updated = await paymentService.confirmTwoFactor(lastTransaction.id, twoFactorCode)
      setLastTransaction(updated)
      setTwoFactorCode('')
      setSuccess(updated.status === 'COMPLETED' ? 'Paiement confirmé après vérification 2FA.' : `Paiement ${statusLabel[updated.status]}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code 2FA invalide ou expiré')
    } finally {
      setConfirmingTwoFactor(false)
    }
  }

  const downloadReceipt = () => {
    if (!lastTransaction) return
    const receipt = [
      'PAYSMART - RECU DE PAIEMENT',
      `Reference: ${lastTransaction.externalReference ?? lastTransaction.id}`,
      `Montant: ${lastTransaction.amount} ${lastTransaction.currency}`,
      `Canal: ${lastTransaction.channel}`,
      `Statut: ${statusLabel[lastTransaction.status]}`,
      `Date: ${new Date(lastTransaction.createdAt).toLocaleString('fr-FR')}`,
    ].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([receipt], { type: 'text/plain;charset=utf-8' }))
    link.download = `paysmart-recu-${lastTransaction.id}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-50">Paiements</h1>
            <p className="mt-1 text-dark-400">Envoyez de l’argent à n’importe quel compte Paysmart existant.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Actualiser les paiements">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        {success && <div className="mb-5 rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300">{success}</div>}
        {lastTransaction && (
          <div className="mb-5 rounded-lg border border-primary-500/30 bg-primary-500/10 p-4 text-sm text-primary-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Transaction {lastTransaction.externalReference ?? `#${lastTransaction.id}`} : {statusLabel[lastTransaction.status]}</span>
              <Button type="button" size="sm" variant="outline" onClick={downloadReceipt}><Printer className="h-4 w-4" /> Télécharger le reçu</Button>
            </div>
            {lastTransaction.metadata?.qrData && <p className="mt-2 font-mono text-xs">QR : {lastTransaction.metadata.qrData}</p>}
            {lastTransaction.metadata?.temporaryIban && <p className="mt-2 font-mono text-xs">IBAN temporaire : {lastTransaction.metadata.temporaryIban}</p>}
            {lastTransaction.status === 'PENDING' && lastTransaction.failureReason === 'Vérification 2FA requise avant exécution.' && (
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-primary-500/20 pt-4">
                <div className="min-w-48 flex-1">
                  <label className="mb-1 block text-xs text-primary-100" htmlFor="two-factor-code">Code reçu dans vos notifications</label>
                  <input
                    id="two-factor-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full rounded-lg border border-primary-200/30 bg-dark-900/60 px-3 py-2 font-mono text-dark-50 outline-none focus:border-primary-300"
                  />
                </div>
                <Button type="button" size="sm" onClick={() => void confirmTwoFactor()} disabled={twoFactorCode.length !== 6 || confirmingTwoFactor} isLoading={confirmingTwoFactor}>
                  Confirmer le paiement
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submitPayment} className="rounded-xl border border-dark-700 bg-dark-800 p-6">
            <div className="mb-5 flex items-center gap-3">
              <Send className="h-5 w-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-dark-50">Envoyer un paiement</h2>
            </div>
            <label className="mb-2 block text-sm text-dark-300" htmlFor={paymentMode === 'MOBILE_MONEY' ? 'phone-number' : 'recipient-account'}>
              {paymentMode === 'MOBILE_MONEY' ? 'Numéro de téléphone destinataire' : 'Numéro du compte destinataire'}
            </label>
            <div className="flex gap-2">
              <input
                id={paymentMode === 'MOBILE_MONEY' ? 'phone-number' : 'recipient-account'}
                inputMode="numeric"
                pattern="[0-9]+"
                value={paymentMode === 'MOBILE_MONEY' ? phoneNumber : recipientWalletNumber}
                onChange={(event) => paymentMode === 'MOBILE_MONEY' ? setPhoneNumber(event.target.value.replace(/\D/g, '')) : setRecipientWalletNumber(event.target.value.replace(/\D/g, ''))}
                placeholder={paymentMode === 'MOBILE_MONEY' ? '0340000000' : '000000010000'}
                className="min-w-0 flex-1 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-primary-500"
              />
              <Button type="button" variant="outline" onClick={() => void findRecipient()}>Rechercher</Button>
            </div>
            {recipient && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary-500/30 bg-primary-500/10 p-3">
                <UserRound className="h-5 w-5 text-primary-300" />
                <div>
                  <p className="font-semibold text-dark-100">{recipient.cardHolderName}</p>
                  <p className="text-xs text-dark-400">{recipient.role} · {recipient.walletNumber}</p>
                </div>
              </div>
            )}
            <div className="mt-5">
              <p className="mb-2 text-sm text-dark-300">Mode de paiement</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Mode de paiement">
                {([
                  ['MOBILE_MONEY', 'Mobile Money'],
                  ['CARD', 'Carte bancaire'],
                  ['QR', 'QR Code'],
                  ['BANK_TRANSFER', 'Virement'],
                ] as Array<[PaymentMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={paymentMode === mode}
                    onClick={() => {
                      setPaymentMode(mode)
                      if (mode === 'MOBILE_MONEY') setChannel('MVOLA')
                      if (mode === 'CARD') setChannel('CARD')
                      if (mode === 'QR') setChannel('QR')
                      if (mode === 'BANK_TRANSFER') setChannel('BANK_TRANSFER')
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${paymentMode === mode ? 'border-primary-500 bg-primary-600/15 text-primary-300' : 'border-dark-700 bg-dark-900 text-dark-400 hover:border-primary-600/50 hover:text-dark-100'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {paymentMode === 'MOBILE_MONEY' && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-dark-300">Opérateur Mobile Money</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Opérateur Mobile Money">
                  {mobileMoneyChannels.map((item) => (
                    <button key={item.value} type="button" role="radio" aria-checked={channel === item.value} onClick={() => { setChannel(item.value); setError(null) }} className={`min-h-14 rounded-lg border px-2 py-3 text-sm font-semibold transition-colors ${channel === item.value ? 'border-primary-400 bg-primary-600/20 text-primary-200 ring-2 ring-primary-500/40' : 'border-dark-600 bg-dark-900 text-dark-300 hover:border-primary-500/60 hover:text-dark-100'}`}>
                      <span className="block">{item.label}</span>
                      <span className="mt-1 block text-[10px] font-normal text-dark-500">Sélectionner</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-primary-300">Opérateur sélectionné : <strong>{mobileMoneyChannels.find((item) => item.value === channel)?.label}</strong></p>
              </div>
            )}
            <div className="mt-5">
              <div>
                <label className="mb-2 block text-sm text-dark-300" htmlFor="amount">Montant</label>
                <input id="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-primary-500" />
              </div>
            </div>
            {paymentMode === 'MOBILE_MONEY' && (
              <div className="mt-4">
                <p className="text-xs text-dark-500">Le compte destinataire est recherché avec ce numéro. Les opérateurs sont proposés ci-dessus.</p>
              </div>
            )}
            {paymentMode === 'CARD' && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm text-dark-300" htmlFor="card-token">Token de carte bancaire</label>
                  <Button type="button" size="sm" variant="outline" onClick={generateCardToken}>
                    <WandSparkles className="h-4 w-4" /> Générer
                  </Button>
                </div>
                <input id="card-token" required value={cardToken} onChange={(event) => setCardToken(event.target.value)} placeholder="Cliquez sur Générer" className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 font-mono text-sm text-dark-100 outline-none focus:border-primary-500" />
                <p className="mt-2 text-xs text-dark-500">Un token sandbox unique sera créé automatiquement pour ce paiement.</p>
              </div>
            )}
            {paymentMode === 'QR' && (
              <div className="mt-4 rounded-lg border border-primary-500/30 bg-primary-500/10 p-3 text-sm text-primary-200">
                QR dynamique prêt à être généré pour le compte {recipient?.walletNumber || 'destinataire'}.
              </div>
            )}
            {paymentMode === 'BANK_TRANSFER' && (
              <div className="mt-4 space-y-3 rounded-lg border border-dark-700 bg-dark-900/50 p-3">
                <p className="text-sm text-dark-300">Un IBAN temporaire et une référence seront associés à ce virement.</p>
                <label className="block text-sm text-dark-300" htmlFor="bank-reference">Référence bancaire (optionnel)</label>
                <input id="bank-reference" value={bankReference} onChange={(event) => setBankReference(event.target.value)} placeholder="Référence du virement" className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-primary-500" />
              </div>
            )}
            <Button type="submit" className="mt-6 w-full" disabled={!recipient || submitting || (paymentMode === 'MOBILE_MONEY' && !mobileMoneyChannels.some((item) => item.value === channel))} isLoading={submitting}>Payer maintenant</Button>
            <p className="mt-3 text-xs text-dark-500">Le paiement est autorisé uniquement vers un compte existant et vérifié.</p>
          </form>

          <div className="overflow-hidden rounded-2xl border border-primary-500/40 bg-linear-to-br from-primary-700 via-primary-600 to-dark-800 p-5 shadow-2xl shadow-primary-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-primary-100">Paysmart</p>
                  <p className="text-xs font-semibold tracking-[0.2em] text-white">VIRTUAL</p>
                </div>
              </div>
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-primary-100">Pay</span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/10 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-primary-100">Expéditeur</p>
                    <p className="mt-1 font-mono text-xs text-white">{card?.walletNumber || '—'}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-200/50 bg-primary-500/20 text-base text-primary-100">→</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-primary-100">Destinataire</p>
                    <p className="mt-1 font-mono text-xs text-white">{recipient?.walletNumber || '—'}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-200/50 bg-white/10 text-base text-white">⇄</div>
                </div>
              </div>
            </div>

            <p className="mt-6 font-mono text-xl tracking-[0.35em] text-white">{card?.cardNumber || '•••• •••• •••• ••••'}</p>
            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase text-primary-100">Titulaire</p>
                <p className="text-sm font-semibold text-white">{card?.cardHolderName || user?.email || '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-primary-100">Compte</p>
                <p className="font-mono text-xs text-white">{card?.walletNumber || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-dark-50">Historique des transactions</h2><Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer</Button></div>
          {loading ? <p className="text-sm text-dark-400">Chargement...</p> : history.length === 0 ? <p className="text-sm text-dark-400">Aucune transaction.</p> : <div className="space-y-3">{history.map((transaction) => { const outgoing = transaction.direction === 'OUTGOING'; return <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dark-700 bg-dark-900/50 p-4"><div className="flex items-center gap-3">{outgoing ? <ArrowUpRight className="h-5 w-5 text-red-400" /> : <ArrowDownLeft className="h-5 w-5 text-green-400" />}<div><p className="text-sm font-medium text-dark-100">{transaction.channel} · {transaction.externalReference || `#${transaction.id}`}</p><p className="text-xs text-dark-500">{new Date(transaction.createdAt).toLocaleString('fr-FR')}</p></div></div><div className="text-right"><p className="font-semibold text-dark-100">{outgoing ? '-' : '+'}{Number(transaction.amount).toFixed(2)} {transaction.currency}</p><p className={`text-xs ${transaction.status === 'COMPLETED' ? 'text-green-400' : transaction.status === 'FAILED' ? 'text-red-400' : 'text-yellow-400'}`}>{statusLabel[transaction.status]}</p></div></div> })}</div>}
        </section>
      </div>
    </div>
  )
}
