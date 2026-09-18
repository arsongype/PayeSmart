import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LoginForm } from '../../components/auth/LoginForm'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useTranslation()
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
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/50 p-3 text-xs text-green-400 text-center max-w-md mx-auto">
          {successMessage}
        </div>
      )}
      <LoginForm onSuccess={() => navigate('/dashboard', { replace: true })} />
    </div>
  )
}



