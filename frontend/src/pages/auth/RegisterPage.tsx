import { Navigate, useNavigate } from 'react-router-dom'
import { RegisterForm } from '../../components/auth/RegisterForm'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../../components/common/Loader'

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  if (isLoading) {
    return <FullPageLoader />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <RegisterForm
      onSuccess={() =>
        navigate('/login', {
          replace: true,
          state: { successMessage: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.' },
        })
      }
    />
  )
}
