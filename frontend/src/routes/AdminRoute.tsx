import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppLayout } from '../layouts/AppLayout'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
