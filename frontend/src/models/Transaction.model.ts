import type { User } from './User.model'
export interface Transaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'breaching_sla' | 'review'
  reason: string
  merchant: string
  merchantId: string
  payerId: string
  waitingTime: number
  createdAt: string
  updatedAt: string
  owner?: User
}

export interface TransactionStats {
  totalWaiting: number
  totalAmount: number
  medianWaitTime: number
  breachedSla: number
  needsReview: number
}

export type TransactionStatus = Transaction['status']
