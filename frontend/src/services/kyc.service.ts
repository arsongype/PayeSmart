import { apiClient } from '../config/axios.config'
import type { KycDocument, KybDocument } from '../models/User.model'

export const kycService = {
  async getDocuments(userId: number): Promise<KycDocument[]> {
    const { data } = await apiClient.get(`/kyc/${userId}`)
    return data
  },

  async uploadDocument(userId: number, document: Partial<KycDocument>) {
    const { data } = await apiClient.post(`/kyc?userId=${userId}`, document)
    return data
  },

  async deleteDocument(documentId: number) {
    const { data } = await apiClient.delete(`/kyc/${documentId}`)
    return data
  },
}

export const kybService = {
  async getDocuments(userId: number): Promise<KybDocument[]> {
    const { data } = await apiClient.get(`/kyb/${userId}`)
    return data
  },

  async uploadDocument(userId: number, document: Partial<KybDocument>) {
    const { data } = await apiClient.post(`/kyb?userId=${userId}`, document)
    return data
  },

  async deleteDocument(documentId: number) {
    const { data } = await apiClient.delete(`/kyb/${documentId}`)
    return data
  },
}
