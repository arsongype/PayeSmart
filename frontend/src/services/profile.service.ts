import { apiClient } from '../config/axios.config'
import { API_ORIGIN } from '../config/env'
import type { Profile, User } from '../models/User.model'

export const profileService = {
  assetUrl(path?: string | null): string | undefined {
    if (!path) return undefined
    return path.startsWith('http') ? path : `${API_ORIGIN}${path}`
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },

  async updateMe(data: Partial<User>): Promise<User> {
    const { data: user } = await apiClient.patch('/auth/me', data)
    return user
  },

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData()
    formData.append('avatar', file)
    const { data } = await apiClient.post<User>('/profiles/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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
