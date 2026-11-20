import { apiClient } from '../config/axios.config'

export type WithdrawalMethod = 'BANK_TRANSFER'
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'

export interface WithdrawalOptions {
  countryCode: string
  methods: WithdrawalMethod[]
}

export interface WithdrawalRequest {
  id: number
  amount: number
  currency: string
  countryCode: string
  method: WithdrawalMethod
  destinationSummary: string
  status: WithdrawalStatus
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  paidAt: string | null
}

export interface AdminWithdrawalRequest extends WithdrawalRequest {
  destination: {
    recipientName: string
    account: string
    bankName?: string
    note?: string
  }
  user: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

export interface CreateWithdrawalInput {
  amount: number
  method: WithdrawalMethod
  recipientName: string
  destinationAccount: string
  bankName?: string
  note?: string
}

export const withdrawalService = {
  async getOptions(): Promise<WithdrawalOptions> {
    const { data } = await apiClient.get<WithdrawalOptions>('/withdrawals/options')
    return data
  },

  async listMine(): Promise<WithdrawalRequest[]> {
    const { data } = await apiClient.get<WithdrawalRequest[]>('/withdrawals')
    return data
  },

  async create(input: CreateWithdrawalInput): Promise<WithdrawalRequest> {
    const { data } = await apiClient.post<WithdrawalRequest>('/withdrawals', input)
    return data
  },

  async cancel(id: number): Promise<WithdrawalRequest> {
    const { data } = await apiClient.patch<WithdrawalRequest>(`/withdrawals/${id}/cancel`)
    return data
  },

  async listForAdmin(): Promise<AdminWithdrawalRequest[]> {
    const { data } = await apiClient.get<AdminWithdrawalRequest[]>('/admin/withdrawals')
    return data
  },

  async approve(id: number): Promise<WithdrawalRequest> {
    const { data } = await apiClient.patch<WithdrawalRequest>(`/admin/withdrawals/${id}/approve`)
    return data
  },

  async reject(id: number, note: string): Promise<WithdrawalRequest> {
    const { data } = await apiClient.patch<WithdrawalRequest>(`/admin/withdrawals/${id}/reject`, { note })
    return data
  },

  async markPaid(id: number, note?: string): Promise<WithdrawalRequest> {
    const { data } = await apiClient.patch<WithdrawalRequest>(`/admin/withdrawals/${id}/paid`, { note })
    return data
  },
}
