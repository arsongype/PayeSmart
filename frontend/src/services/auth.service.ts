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

  async verifyEmail(payload: { token: string }): Promise<void> {
    await apiClient.post('/auth/verify-email', payload)
  },

  async requestEmailVerification(): Promise<{ token: string }> {
    const { data } = await apiClient.post('/auth/verify-email/request')
    return data
  },

  async getTwoFactorStatus(): Promise<{ isTwoFactorEnabled: boolean }> {
    const { data } = await apiClient.get('/auth/two-factor/status')
    return data
  },

  async setupTwoFactor(): Promise<{ secret: string; otpauthUrl: string }> {
    const { data } = await apiClient.post('/auth/two-factor/setup')
    return data
  },

  async verifyTwoFactor(payload: { email: string; code: string }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/two-factor/verify', payload)
    return data
  },

  async enableTwoFactor(payload: { code: string }): Promise<void> {
    await apiClient.post('/auth/two-factor/enable', payload)
  },

  async disableTwoFactor(payload: { code: string }): Promise<void> {
    await apiClient.post('/auth/two-factor/disable', payload)
  },

  async getPaymentMethods() {
    const { data } = await apiClient.get('/auth/payment-methods')
    return data
  },

  async createPaymentMethod(payload: { methodType: string; lastFourDigits?: string; brand?: string; expiryDate?: string }) {
    const { data } = await apiClient.post('/auth/payment-methods', payload)
    return data
  },

  async deletePaymentMethod(id: number) {
    await apiClient.delete(`/auth/payment-methods/${id}`)
  },

  async getDevices() {
    const { data } = await apiClient.get('/auth/devices')
    return data
  },

  async getMe(): Promise<{ user: import('../models/User.model').User }> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },

  async verifyOtp(payload: { email: string; otp: string }): Promise<void> {
    await apiClient.post('/auth/verify-otp', payload)
  },
}
