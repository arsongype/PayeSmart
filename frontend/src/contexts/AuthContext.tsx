import { createContext, useContext } from 'react'
import type { User } from '../models/User.model'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  register: (data: { email: string; password: string; confirmPassword: string; firstName: string; lastName: string; cin?: string; phone?: string; dateOfBirth?: string; address: string; city: string; country: string; postalCode: string; role?: 'USER' | 'MERCHANT' | 'ADMIN' }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}




