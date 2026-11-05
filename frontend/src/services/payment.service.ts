import { apiClient } from '../config/axios.config'

export type PaymentChannel = 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'CARD' | 'QR' | 'BANK_TRANSFER'
export type PaymentCurrency = 'MGA' | 'EUR' | 'USD' | 'XOF'

export interface RecipientAccount {
  walletNumber: string
  cardHolderName: string
  firstName: string
  lastName: string
  role: 'USER' | 'MERCHANT' | 'ADMIN'
}

export interface PaymentTransaction {
  id: number
  senderWalletId: number
  recipientWalletId: number
  amount: number
  feeAmount: number
  totalAmount: number
  currency: string
  channel: PaymentChannel
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  externalReference?: string | null
  failureReason?: string | null
  metadata?: {
    qrData?: string
    phoneNumber?: string
    senderDebitAmount?: number
    recipientCreditAmount?: number
    senderCurrency?: string
    recipientCurrency?: string
    sandboxExchangeRate?: boolean
    riskScore?: number
    riskLevel?: string
    riskDecision?: string
    riskReasons?: string[]
    twoFactorExpiresAt?: string
  } | null
  recipient?: {
    name: string
    walletNumber: string
  }
  canConfirmQr?: boolean
  createdAt: string
  updatedAt: string
  direction?: 'OUTGOING' | 'INCOMING'
}

export interface PaymentQuote {
  amount: number
  feeAmount: number
  totalAmount: number
  currency: PaymentCurrency
  walletCurrency: PaymentCurrency
  walletDebitAmount: number
}

export const paymentService = {
  async findRecipient(walletNumber: string): Promise<RecipientAccount> {
    const { data } = await apiClient.get(`/payments/recipient/${encodeURIComponent(walletNumber)}`)
    return data
  },

  async findRecipientByPhone(phoneNumber: string): Promise<RecipientAccount> {
    const { data } = await apiClient.get(`/payments/recipient-by-phone/${encodeURIComponent(phoneNumber)}`)
    return data
  },

  async initiate(payload: { recipientWalletNumber?: string; amount: number; channel: PaymentChannel; currency?: PaymentCurrency; phoneNumber?: string; cardToken?: string }): Promise<PaymentTransaction> {
    const { data } = await apiClient.post('/payments/initiate', payload)
    return data
  },

  async quote(amount: number, currency: PaymentCurrency): Promise<PaymentQuote> {
    const { data } = await apiClient.post('/payments/quote', { amount, currency })
    return data
  },

  async history(): Promise<PaymentTransaction[]> {
    const { data } = await apiClient.get('/payments/history')
    return data
  },

  async get(transactionId: number): Promise<PaymentTransaction> {
    const { data } = await apiClient.get(`/payments/${transactionId}`)
    return data
  },

  async getQrConfirmation(transactionId: number): Promise<PaymentTransaction> {
    const { data } = await apiClient.get(`/payments/${transactionId}/qr/confirmation`)
    return data
  },

  async confirmTwoFactor(transactionId: number, code: string): Promise<PaymentTransaction> {
    const { data } = await apiClient.post(`/payments/${transactionId}/confirm-2fa`, { code })
    return data
  },

  async confirmQr(transactionId: number): Promise<PaymentTransaction> {
    const { data } = await apiClient.post(`/payments/${transactionId}/qr/confirm`)
    return data
  },

  async getTwoFactorStatus(transactionId: number) {
    const { data } = await apiClient.get(`/payments/${transactionId}/two-factor-status`)
    return data
  },

  async cancel(transactionId: number): Promise<PaymentTransaction> {
    const { data } = await apiClient.post(`/payments/${transactionId}/cancel`)
    return data
  },
}
