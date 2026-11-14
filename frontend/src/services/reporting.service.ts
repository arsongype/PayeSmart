import axios from 'axios'
import { apiClient } from '../config/axios.config'
import type { SupportedCurrency } from '../utils/formatters'

export interface DashboardTransactionDetail {
  id: number
  sender: string | null
  recipient: string | null
  amount: number
  currency: string
  channel: string
  status: string
  createdAt: string
}

export interface DashboardReport {
  totals: {
    volume: number
    transactions: number
    fraudRate: number
    revenue: number
  }
  channels: Array<{ channel: string; amount: number; transactions: number }>
  aiMetrics: {
    precision: number | null
    recall: number | null
    f1Score: number | null
    analyzedTransactions: number
    evaluationSamples: number
    metricSource: 'reviewed_transactions' | 'transaction_status_proxy' | 'unconfigured'
  }
  admin: {
    activeUsers: number
    transactionsToReview: number
    aiAlerts: number
    transactionFees?: Array<{ currency: SupportedCurrency; amount: number }>
    transactionRates?: Array<{ channel: string; transactions: number; rate: number }>
    pendingTransactions?: DashboardTransactionDetail[]
    aiAlertDetails?: Array<DashboardTransactionDetail & { riskScore: number; reason: string }>
  } | null
}

export const getDashboardReport = async () => {
  const { data } = await apiClient.get<DashboardReport>('/reporting/dashboard')
  return data
}

export const downloadReport = async () => {
  try {
    const response = await apiClient.get<Blob>('/reporting/export?format=pdf', { responseType: 'blob' })
    if (response.data.size === 0) throw new Error('Le rapport PDF est vide')
    const disposition = response.headers['content-disposition'] as string | undefined
    const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? 'paysmart-report.pdf'
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data
      if (responseData instanceof Blob) {
        const message = await readErrorBlob(responseData)
        if (message) throw new Error(message, { cause: error })
      }
      const message = typeof responseData === 'object' && responseData !== null && 'message' in responseData
        ? responseData.message
        : null
      if (typeof message === 'string') throw new Error(message, { cause: error })
    }
    throw error
  }
}

const readErrorBlob = async (blob: Blob): Promise<string | null> => {
  try {
    const payload = JSON.parse(await blob.text()) as { message?: unknown; error?: unknown }
    if (typeof payload.message === 'string') return payload.message
    if (Array.isArray(payload.message)) {
      const messages = payload.message.filter((message): message is string => typeof message === 'string')
      if (messages.length > 0) return messages.join(', ')
    }
    return typeof payload.error === 'string' ? payload.error : null
  } catch {
    return null
  }
}