import { apiClient } from '../config/axios.config'
import type { KybDocument } from '../models/User.model'

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
