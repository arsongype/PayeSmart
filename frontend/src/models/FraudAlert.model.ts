export interface FraudAlert {
  id: number
  transactionId: number
  amount: number
  currency: string
  status: string
  channel: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  sender: { id: number; name: string } | null
  recipient: { id: number; name: string } | null
  createdAt: string
}

export interface RiskScore {
  score: number
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
}
