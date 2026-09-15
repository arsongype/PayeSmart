import { apiClient } from '../config/axios.config'
import type { Wallet } from '../models/User.model'

export const walletService = {
  async getWallet(userId: number): Promise<Wallet> {
    const { data } = await apiClient.get(`/wallets/${userId}`)
    return data
  },

  async createWallet(userId: number, wallet: Partial<Wallet>) {
    const { data } = await apiClient.post(`/wallets?userId=${userId}`, wallet)
    return data
  },

  async updateWallet(userId: number, wallet: Partial<Wallet>) {
    const { data } = await apiClient.patch(`/wallets/${userId}`, wallet)
    return data
  },

  async authorizeOutgoing(userId: number, amount: number) {
    const { data } = await apiClient.post(`/wallets/${userId}/outgoing`, { amount })
    return data
  },
}
