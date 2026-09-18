import { apiClient } from '../config/axios.config'

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
  }
  admin: {
    activeUsers: number
    transactionsToReview: number
    aiAlerts: number
  } | null
}

export const getDashboardReport = async () => {
  const { data } = await apiClient.get<DashboardReport>('/reporting/dashboard')
  return data
}

export const downloadReport = async (format: 'csv' | 'pdf') => {
  const response = await apiClient.get<Blob>(`/reporting/export?format=${format}`, { responseType: 'blob' })
  const disposition = response.headers['content-disposition'] as string | undefined
  const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? `paysmart-report.${format}`
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}