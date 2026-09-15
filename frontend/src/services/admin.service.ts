import { apiClient } from '../config/axios.config'

export const adminService = {
  async getUsers() {
    const { data } = await apiClient.get('/auth/users')
    return data
  },

  async getUserDetail(userId: number) {
    const { data } = await apiClient.get(`/admin/users/${userId}`)
    return data
  },

  async updateUserRole(userId: number, role: 'USER' | 'MERCHANT' | 'ADMIN') {
    const { data } = await apiClient.patch(`/auth/users/${userId}/role`, { role })
    return data
  },

  async reviewKyc(documentId: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const { data } = await apiClient.patch(`/admin/kyc/${documentId}/review`, { status, rejectionReason })
    return data
  },

  async reviewKyb(documentId: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const { data } = await apiClient.patch(`/admin/kyb/${documentId}/review`, { status, rejectionReason })
    return data
  },

  async getTrustScore(userId: number) {
    const { data } = await apiClient.get(`/kyc/trust-score/${userId}`)
    return data
  },

  async recalculateTrustScore(userId: number) {
    const { data } = await apiClient.post(`/kyc/trust-score/${userId}/recalculate`)
    return data
  },
}
