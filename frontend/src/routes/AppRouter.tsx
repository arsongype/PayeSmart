/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { FullPageLoader } from '../components/common/Loader'
import { AuthLayout } from '../layouts/AuthLayout'
import ProtectedRoute from './ProtectedRoute'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminUserDetailPage = lazy(() => import('../pages/admin/AdminUserDetailPage'))
const AdminFraudPage = lazy(() => import('../pages/admin/AdminFraudPage'))
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'))
const WalletPage = lazy(() => import('../pages/profile/WalletPage'))
const KycPage = lazy(() => import('../pages/profile/KycPage'))
const PaymentsPage = lazy(() => import('../pages/payments/PaymentsPage'))
const ConfirmQrPage = lazy(() => import('../pages/payments/ConfirmQrPage'))
const SettingsPage = lazy(() => import('../pages/profile/SettingsPage'))

const loader = (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <FullPageLoader />
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={loader}>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={loader}>
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <Suspense fallback={loader}>
        <AuthLayout>
          <ForgotPasswordPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={loader}>
        <AuthLayout>
          <ResetPasswordPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <DashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <AdminUsersPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/payments',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <PaymentsPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/payments/confirm/:id',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <ConfirmQrPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <ProfilePage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <SettingsPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/wallet',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <WalletPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/kyc',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <KycPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/kyb',
    element: <Navigate to="/kyc" replace />,
  },
  {
    path: '/admin/users/:id',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <AdminUserDetailPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/fraud',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <AdminFraudPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])




