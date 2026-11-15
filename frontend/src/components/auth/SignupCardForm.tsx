import { useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '../common/Button'
import { authService } from '../../services/auth.service'

interface SignupCardFormProps {
  email: string
  onSetupComplete: (setupIntentId: string | null) => void
}

interface SetupIntentConfig {
  clientSecret: string
  publishableKey: string
}

export function SignupCardForm({ email, onSetupComplete }: SignupCardFormProps) {
  const [setupIntent, setSetupIntent] = useState<SetupIntentConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void authService.createSignupSetupIntent(email)
      .then((config) => {
        if (active) setSetupIntent(config)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Impossible de préparer la carte.')
        }
      })

    return () => {
      active = false
      onSetupComplete(null)
    }
  }, [email, onSetupComplete])

  const stripePromise = useMemo(
    () => setupIntent ? loadStripe(setupIntent.publishableKey) : null,
    [setupIntent],
  )

  if (error) {
    return <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>
  }

  if (!setupIntent || !stripePromise) {
    return <p role="status" className="text-xs text-gray-600">Préparation du formulaire sécurisé…</p>
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      <Elements stripe={stripePromise} options={{ clientSecret: setupIntent.clientSecret }}>
        <ConfirmSignupCard onSetupComplete={onSetupComplete} />
      </Elements>
    </div>
  )
}

function ConfirmSignupCard({ onSetupComplete }: Pick<SignupCardFormProps, 'onSetupComplete'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const confirmCard = async () => {
    if (!stripe || !elements) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await stripe.confirmSetup({ elements, redirect: 'if_required' })
      if (result.error) {
        setError(result.error.message ?? 'La vérification de la carte a échoué.')
        onSetupComplete(null)
      } else if (result.setupIntent?.status === 'succeeded') {
        setIsComplete(true)
        onSetupComplete(result.setupIntent.id)
      } else {
        setError('La carte n’a pas pu être confirmée.')
        onSetupComplete(null)
      }
    } catch (confirmationError) {
      setError(confirmationError instanceof Error ? confirmationError.message : 'La vérification de la carte a échoué.')
      onSetupComplete(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card'] }} />
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {isComplete && <p role="status" className="text-xs text-green-700">Carte confirmée. Vous pouvez terminer la création du compte.</p>}
      {!isComplete && (
        <Button type="button" size="md" isLoading={isLoading} disabled={!stripe || !elements} onClick={confirmCard}>
          Confirmer la carte Visa
        </Button>
      )}
    </div>
  )
}
