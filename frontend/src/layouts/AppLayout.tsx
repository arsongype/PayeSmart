import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  AlertTriangle,
  Bell,
  CreditCard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User,
  Users as UsersIcon,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../config/axios.config'
import { ROUTES } from '../utils/constants'
import { useLocale } from '../hooks/useLocale'
import { useTranslation } from '../utils/i18n'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const locale = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string; link: string | null }>>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const openNotifications = async () => {
    setNotificationsOpen((open) => !open)
    if (unreadNotifications === 0) return
    const unread = notifications.filter((notification) => !notification.isRead)
    await Promise.all(unread.map((notification) => apiClient.patch(`/notifications/${notification.id}/read`).catch(() => undefined)))
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    setUnreadNotifications(0)
  }

  useEffect(() => {
    if (!user?.id) return

    let intervalId: ReturnType<typeof setInterval> | undefined = undefined

    const loadNotifications = async () => {
      try {
        const { data } = await apiClient.get<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string; link: string | null }>>('/notifications')
        setNotifications(data)
        setUnreadNotifications(data.filter((notification) => !notification.isRead).length)
      } catch {
        // ignore notification polling errors
      }
    }

    void loadNotifications()
    intervalId = window.setInterval(loadNotifications, 2000)
    window.addEventListener('focus', loadNotifications)

    return () => {
      if (intervalId) window.clearInterval(intervalId)
      window.removeEventListener('focus', loadNotifications)
    }
  }, [user?.id])

  const navItems = [
    { icon: BarChart3, label: t('overview'), href: ROUTES.DASHBOARD },
    { icon: CreditCard, label: t('payments'), href: ROUTES.PAYMENTS },
    { icon: User, label: t('profile'), href: ROUTES.PROFILE },
    { icon: WalletIcon, label: t('wallet'), href: ROUTES.WALLET },
    { icon: Shield, label: user?.role === 'MERCHANT' ? t('verificationKycKyb') : t('verificationKyc'), href: ROUTES.KYC },
    ...(user?.role === 'ADMIN' ? [{ icon: AlertTriangle, label: t('fraudAlerts'), href: ROUTES.ADMIN_FRAUD }] : []),
    { icon: Settings, label: t('settings'), href: '/settings' },
    ...(user?.role === 'ADMIN' ? [{ icon: UsersIcon, label: t('users'), href: ROUTES.ADMIN_USERS }] : []),
  ]

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-white text-black">
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('closeMenu')}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-gray-300 bg-white shadow-2xl shadow-black/20 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white bg-white px-5">
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2" aria-label={t('paysmartHome')}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#3B78E7] to-[#5B8FF5] shadow-md shadow-primary-500/25">
              <Shield className="h-5 w-5 text-black" />
            </span>
            <span className="font-serif text-xl font-bold tracking-tight">{t('paysmart')}</span>
          </Link>
          <button
            type="button"
            aria-label={t('closeMenu')}
               className="rounded-md p-2 text-black hover:bg-gray-200 hover:text-black lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4" aria-label={t('navigationMain')}>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const active = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-gray-400 bg-primary-600/15 text-black shadow-[inset_3px_0_0_#28b7a6]'
                      : 'border-gray-200 text-black hover:bg-gray-200/60 hover:text-black'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-gray-300 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-black">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-black">{user?.firstName} {user?.lastName}</p>
               <p className="truncate text-xs text-black">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-black transition-colors hover:bg-red-500/10"
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-300/80 bg-gray-50/75 px-4 shadow-lg shadow-black/5 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={t('openMenu')}
              className="rounded-md p-2 text-black hover:bg-gray-200 hover:text-black lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-gray-300 bg-white/5 px-3 py-1.5 sm:flex">
               <Search size={16} className="text-black" />
              <input
                type="search"
                placeholder={t('searchPlaceholder')}
                aria-label={t('search')}
                 className="w-40 bg-transparent text-sm text-black outline-none placeholder:text-black sm:w-56"
              />
            </div>
            <p className="truncate text-sm font-medium text-black sm:hidden">{t('paysmart')}</p>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-4">
             <button type="button" aria-label={t('notifications')} title={t('notifications')} onClick={() => void openNotifications()} className="relative rounded-md p-2 text-black hover:bg-gray-200 hover:text-black">
              <Bell size={20} />
              {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-xs leading-4 text-black">{unreadNotifications}</span>}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
                  <p className="text-sm font-semibold text-black">{t('notifications')}</p>
                   <span className="text-xs text-black">{notifications.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                     <p className="px-4 py-6 text-center text-sm text-black">{t('noNotifications')}</p>
                   ) : notifications.slice(0, 8).map((notification) => (
                     <div key={notification.id} className="border-b border-gray-300/70 px-4 py-3 last:border-0">
                       <div className="flex items-start justify-between gap-3">
                         <p className="text-sm font-medium text-black">{notification.title}</p>
                         {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-400" aria-label={t('unread')} />}
                       </div>
                       <p className="mt-1 text-xs leading-5 text-black">{notification.message}</p>
                       {notification.link ? (
                         <a href={notification.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary-600 underline underline-offset-2">
                           {t('openAction') ?? 'Ouvrir'}
                         </a>
                       ) : null}
                       <p className="mt-1 text-xs text-black">{new Date(notification.createdAt).toLocaleString(locale)}</p>
                     </div>
                   ))}
                </div>
              </div>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-black">{user?.firstName} {user?.lastName}</p>
               <p className="text-xs capitalize text-black">{user?.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-black sm:hidden">
              {initials || '?'}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}



