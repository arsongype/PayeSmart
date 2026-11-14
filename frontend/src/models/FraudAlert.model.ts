export type FraudOutcome = 'CONFIRMED_FRAUD' | 'LEGITIMATE'

export interface FraudAlert {
  id: number
  transactionId: number
  amount: number
  currency: string
  status: string
  reviewStatus?: string
  fraudOutcome?: FraudOutcome | null
  channel: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  sender: { id: number; name: string } | null
  recipient: { id: number; name: string } | null
  createdAt: string
}

export interface FraudInvestigation {
  transaction: {
    id: number
    amount: number
    feeAmount: number
    totalAmount: number
    currency: string
    channel: string
    status: string
    externalReference: string | null
    failureReason: string | null
    createdAt: string
  }
  risk: {
    score: number
    level: string
    decision: string
    reasons: string[]
    features: {
      model: string | null
      amount: number | null
      transaction_count_24h: number | null
      hour: number | null
      channel: string | null
    } | null
  }
  review: {
    status: string
    adminNotes: string | null
    reviewedAt: string | null
    fraudOutcome: FraudOutcome | null
  } | null
  sender: {
    id: number
    name: string
    email: string
    accountStatus: string
    kycStatus: string
    kybStatus: string
    suspensionReason: string | null
    role: string
  }
  recentTransactions: Array<{
    id: number
    amount: number
    currency: string
    channel: string
    status: string
    riskScore: number
    failureReason: string | null
    createdAt: string
  }>
}

export interface RiskScore {
  score: number
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
}
