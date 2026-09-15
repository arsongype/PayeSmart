import type { Transaction } from './Transaction.model'

export interface FraudAlert {
  id: string
  transactionId: string
  transaction: Transaction
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  isResolved: boolean
  resolvedAt?: string
  createdAt: string
}

export interface RiskScore {
  score: number
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
}
