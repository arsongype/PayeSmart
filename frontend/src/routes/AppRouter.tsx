import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { FullPageLoader } from '../components/common/Loader'
import { AuthLayout } from '../layouts/AuthLayout'
import ProtectedRoute from './ProtectedRoute'
import { AdminRoute } from './AdminRoute'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'))
const OtpVerificationPage = lazy(() => import('../pages/auth/OtpVerificationPage'))
const TwoFactorSetupPage = lazy(() => import('../pages/auth/TwoFactorSetupPage'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminUserDetailPage = lazy(() => import('../pages/admin/AdminUserDetailPage'))
const AdminFraudPage = lazy(() => import('../pages/admin/AdminFraudPage'))
const AdminTransactionsPage = lazy(() => import('../pages/admin/AdminTransactionsPage'))
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'))
const WalletPage = lazy(() => import('../pages/profile/WalletPage'))
const KycPage = lazy(() => import('../pages/profile/KycPage'))
const PaymentsPage = lazy(() => import('../pages/payments/PaymentsPage'))
const ConfirmQrPage = lazy(() => import('../pages/payments/ConfirmQrPage'))
const SettingsPage = lazy(() => import('../pages/profile/SettingsPage'))
const NotificationsPage = lazy(() => import('../pages/profile/NotificationsPage'))

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
    path: '/otp-verification',
    element: (
      <Suspense fallback={loader}>
        <AuthLayout>
          <OtpVerificationPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/two-factor/setup',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <TwoFactorSetupPage />
        </Suspense>
      </ProtectedRoute>
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
    path: '/admin',
    element: (
      <AdminRoute>
        <Suspense fallback={loader}>
          <AdminDashboardPage />
        </Suspense>
      </AdminRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminRoute>
        <Suspense fallback={loader}>
          <AdminUsersPage />
        </Suspense>
      </AdminRoute>
    ),
  },
  {
    path: '/admin/transactions',
    element: (
      <AdminRoute>
        <Suspense fallback={loader}>
          <AdminTransactionsPage />
        </Suspense>
      </AdminRoute>
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
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <Suspense fallback={loader}>
          <NotificationsPage />
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
      <AdminRoute>
        <Suspense fallback={loader}>
          <AdminUserDetailPage />
        </Suspense>
      </AdminRoute>
    ),
  },
  {
    path: '/admin/fraud',
    element: (
      <AdminRoute>
        <Suspense fallback={loader}>
          <AdminFraudPage />
        </Suspense>
      </AdminRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
