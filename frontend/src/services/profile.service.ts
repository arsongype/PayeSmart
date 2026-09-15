import { apiClient } from '../config/axios.config'
import type { Profile, User } from '../models/User.model'

export const profileService = {
  async getMe(): Promise<{ user: User }> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },

  async getProfile(userId: number): Promise<Profile> {
    const { data } = await apiClient.get(`/profiles/${userId}`)
    return data
  },

  async createProfile(userId: number, profile: Partial<Profile>) {
    const { data } = await apiClient.post(`/profiles?userId=${userId}`, profile)
    return data
  },

  async updateProfile(userId: number, profile: Partial<Profile>) {
    const { data } = await apiClient.patch(`/profiles/${userId}`, profile)
    return data
  },
}
