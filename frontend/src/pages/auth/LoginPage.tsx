import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LoginForm } from '../../components/auth/LoginForm'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../../components/common/Loader'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage

  if (isLoading) {
    return <FullPageLoader />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div>
      {successMessage && (
        <div role="status" className="mb-3 rounded-lg border border-green-300 bg-green-50 p-2.5 text-center text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}
      <LoginForm onSuccess={() => navigate('/dashboard', { replace: true })} />
    </div>
  )
}
