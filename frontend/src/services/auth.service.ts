import { apiClient } from '../config/axios.config'
import type { AuthResponse, LoginCredentials, RegisterData, RefreshTokenPayload } from '../models/User.model'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  async register(data: RegisterData): Promise<void> {
    const { confirmPassword, ...payload } = data
    void confirmPassword
    await apiClient.post('/auth/register', payload)
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  async refreshToken(payload: RefreshTokenPayload): Promise<{ accessToken: string }> {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh', payload)
    return data
  },

  async forgotPassword(payload: { email: string }): Promise<void> {
    await apiClient.post('/auth/forgot-password', payload)
  },

  async resetPassword(payload: { token: string; password: string }): Promise<void> {
    await apiClient.post('/auth/reset-password', payload)
  },

  async verifyOtp(payload: { email: string; otp: string }): Promise<void> {
    await apiClient.post('/auth/verify-otp', payload)
  },

  async enableTwoFactor(): Promise<{ secret: string; otpauth_url: string }> {
    const { data } = await apiClient.post('/auth/2fa/enable')
    return data
  },

  async confirmTwoFactor(payload: { otp: string }): Promise<void> {
    await apiClient.post('/auth/2fa/confirm', payload)
  },

  async disableTwoFactor(payload: { otp: string }): Promise<void> {
    await apiClient.post('/auth/2fa/disable', payload)
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    await apiClient.post('/auth/change-password', payload)
  },

  async getMe(): Promise<{ user: import('../models/User.model').User }> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },
}
