import { useState, useEffect, type ReactNode, type FC } from 'react'
import { apiClient } from '../config/axios.config'
import { AuthContext } from './AuthContext'
import type { User, AuthResponse } from '../models/User.model'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [twoFactorEmail, setTwoFactorEmail] = useState('')

  useEffect(() => {
    let isMounted = true
    const handleForcedLogout = () => {
      if (isMounted) setUser(null)
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (token && storedUser) {
        try {
          JSON.parse(storedUser)
          const { data: userData } = await apiClient.get<User>('/auth/me')
          if (isMounted) {
            setUser(userData)
            localStorage.setItem('user', JSON.stringify(userData))
          }
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
        }
      }
      if (isMounted) setIsLoading(false)
    }
    initAuth()
    return () => {
      isMounted = false
      window.removeEventListener('auth:logout', handleForcedLogout)
    }
  }, [])

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials)
      const data: { accessToken: string; refreshToken: string; user: User } = response.data
      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
    } catch (error) {
      const err = error as { message?: string }
      if (err.message === '2FA_REQUIRED') {
        setTwoFactorRequired(true)
        setTwoFactorEmail(credentials.email)
      }
      throw error
    }
  }

  const verifyTwoFactor = async (code: string) => {
    const response = await apiClient.post<AuthResponse>('/auth/two-factor/verify', {
      email: twoFactorEmail,
      code,
    })
    const data: { accessToken: string; refreshToken: string; user: User } = response.data
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    setTwoFactorRequired(false)
    setTwoFactorEmail('')
  }

  const register = async (data: {
    email: string
    password: string
    confirmPassword: string
    firstName: string
    lastName: string
    cin?: string
    phone?: string
    dateOfBirth?: string
    address: string
    city: string
    country: string
    postalCode: string
    role?: 'USER' | 'MERCHANT' | 'ADMIN'
  }) => {
    try {
      const { confirmPassword, ...payload } = data
      void confirmPassword
      const body = {
        ...payload,
        role: payload.role ?? 'USER',
      }
      const response = await apiClient.post('/auth/register', body)
      return response.data
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const refreshUser = async () => {
    const response = await apiClient.get('/auth/me')
    const userData: User = response.data
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        twoFactorRequired,
        twoFactorEmail,
        login,
        verifyTwoFactor,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}




