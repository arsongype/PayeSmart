export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PAYMENTS: '/payments',
  PAYMENT_HISTORY: '/payments/history',
  PROFILE: '/profile',
  WALLET: '/wallet',
  KYC: '/kyc',
  KYB: '/kyb',
  ADMIN: '/admin',
  ADMIN_QUEUE: '/admin/queue',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_DETAIL: '/admin/users/:id',
  ADMIN_TRANSACTIONS: '/admin/transactions',
  ADMIN_FRAUD: '/admin/fraud',
} as const

export const USER_ROLES = {
  USER: 'USER',
  MERCHANT: 'MERCHANT',
  ADMIN: 'ADMIN',
} as const

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BREACHING_SLA: 'breaching_sla',
  REVIEW: 'review',
  WAITING: 'waiting',
  NEEDS_REVIEW: 'needs_review',
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
} as const

export const SLA_THRESHOLD_MINUTES = 30

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
} as const
