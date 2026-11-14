import { apiClient } from '../config/axios.config'
import type { AuthResponse, LoginCredentials, RegisterData, RefreshTokenPayload, RegistrationResponse } from '../models/User.model'

export interface SavedPaymentMethod {
  id: number
  methodType: string
  lastFourDigits: string | null
  brand: string | null
  expiryDate: string | null
  isActive: boolean
}

export interface AccountDeletionResult {
  status: 'blocked' | 'scheduled'
  message: string
  reasons?: string[]
  reactivationDeadline?: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  async requestAccountDeletion(payload: { password: string; otpCode?: string }): Promise<AccountDeletionResult> {
    const { data } = await apiClient.delete<AccountDeletionResult>('/profiles/account/deletion', { data: payload })
    return data
  },

  async cancelAccountDeletion(payload: { email: string; password: string; otpCode?: string }): Promise<void> {
    await apiClient.post('/auth/account-deletion/cancel', payload)
  },

  async register(data: RegisterData): Promise<RegistrationResponse> {
    const { confirmPassword, ...payload } = data
    void confirmPassword
    const { data: response } = await apiClient.post<RegistrationResponse>('/auth/register', payload)
    return response
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

  async getPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const { data } = await apiClient.get<SavedPaymentMethod[]>('/auth/payment-methods')
    return data
  },

  async createPaymentMethod(payload: { methodType: string; lastFourDigits?: string; brand?: string; expiryDate?: string }): Promise<SavedPaymentMethod> {
    const { data } = await apiClient.post<SavedPaymentMethod>('/auth/payment-methods', payload)
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
