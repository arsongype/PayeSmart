import { apiClient } from '../config/axios.config'

export type PaymentChannel = 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'CARD' | 'QR' | 'BANK_TRANSFER'

export interface RecipientAccount {
  walletNumber: string
  cardNumber: string
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
  currency: string
  channel: PaymentChannel
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  externalReference?: string | null
  failureReason?: string | null
  metadata?: {
    qrData?: string
    temporaryIban?: string
    phoneNumber?: string
    bankReference?: string
    riskScore?: number
    riskLevel?: string
    riskDecision?: string
    riskReasons?: string[]
  } | null
  createdAt: string
  updatedAt: string
  direction?: 'OUTGOING' | 'INCOMING'
}

export interface VirtualCard {
  walletNumber: string
  cardNumber: string
  cardHolderName: string
  currency: string
  status: string
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

  async getVirtualCard(): Promise<VirtualCard> {
    const { data } = await apiClient.get('/payments/virtual-card')
    return data
  },

  async initiate(payload: { recipientWalletNumber?: string; amount: number; channel: PaymentChannel; currency?: string; phoneNumber?: string; cardToken?: string; bankReference?: string }): Promise<PaymentTransaction> {
    const { data } = await apiClient.post('/payments/initiate', payload)
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
