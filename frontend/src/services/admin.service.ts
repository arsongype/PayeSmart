import { apiClient } from '../config/axios.config'
import { API_ORIGIN } from '../config/env'

export const adminService = {
  assetUrl(path?: string | null): string | undefined {
    if (!path) return undefined
    return path.startsWith('http') ? path : `${API_ORIGIN}${path}`
  },
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

  async suspendUser(userId: number, reason: string) {
    const { data } = await apiClient.patch(`/admin/users/${userId}/suspend`, { reason })
    return data
  },

  async deleteUser(userId: number) {
    const { data } = await apiClient.delete(`/admin/users/${userId}`)
    return data
  },

  async permanentlyDeleteUser(userId: number) {
    const { data } = await apiClient.delete(`/admin/users/${userId}/permanent`)
    return data
  },

  async reactivateUser(userId: number) {
    const { data } = await apiClient.patch(`/admin/users/${userId}/reactivate`)
    return data
  },

  async cancelDeletion(userId: number) {
    const { data } = await apiClient.patch(`/admin/users/${userId}/cancel-deletion`)
    return data
  },

  async getFraudAlerts() {
    const { data } = await apiClient.get('/admin/fraud-alerts')
    return data
  },

  async uploadUserAvatar(userId: number, file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    const { data } = await apiClient.post(`/admin/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async clearUserAvatar(userId: number) {
    const { data } = await apiClient.delete(`/admin/users/${userId}/avatar`)
    return data
  },
}
