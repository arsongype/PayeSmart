import { Navigate, useNavigate } from 'react-router-dom'
import { RegisterForm } from '../../components/auth/RegisterForm'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useTranslation()
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
          state: { successMessage: t('accountCreatedSuccess') },
        })
      }
    />
  )
}
