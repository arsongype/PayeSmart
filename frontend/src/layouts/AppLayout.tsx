import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  AlertTriangle,
  Bell,
  CreditCard,
  LogOut,
  Menu,
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
import logo from '../assets/Logo.png'
import { profileService } from '../services/profile.service'

interface AppLayoutProps {
  children: ReactNode
}

function getNotificationActionUrl(link: string): string {
  const target = new URL(link, window.location.origin)
  target.searchParams.delete('qrToken')
  return target.href
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, updateUser } = useAuth()
  const { t } = useTranslation()
  const translationRef = useRef(t)
  const location = useLocation()
  const isNotificationsPage = location.pathname === ROUTES.NOTIFICATIONS
  const locale = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string; link: string | null }>>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState<string | null>(null)

  useEffect(() => {
    if (!notificationsOpen) return

    const timeoutId = window.setTimeout(() => setNotificationsOpen(false), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [notificationsOpen])

  useEffect(() => {
    translationRef.current = t
  }, [t])

  const openNotifications = async () => {
    const opening = !notificationsOpen
    setNotificationsOpen(opening)
    if (!opening) return

    try {
      const { data } = await apiClient.patch<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string; link: string | null }>>('/notifications/read-all')
      setNotifications(data)
      setUnreadNotifications(data.filter((notification) => !notification.isRead).length)
      setNotificationsError(null)
      window.dispatchEvent(new CustomEvent('paysmart:notifications-updated', { detail: data }))
    } catch (error) {
      setNotificationsError(translationRef.current('cannotMarkNotificationRead'))
      console.error('Unable to mark notifications as read', error)
    }
  }

  useEffect(() => {
    if (!user?.id) return

    let intervalId: ReturnType<typeof setInterval> | undefined = undefined
    let loading = false
    let lastRequestAt = 0

    const loadNotifications = async (force = false) => {
      if (loading || document.visibilityState === 'hidden' || (!force && Date.now() - lastRequestAt < 30_000)) return
      loading = true
      lastRequestAt = Date.now()
      try {
        const { data } = await apiClient.get<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string; link: string | null }>>('/notifications')
        setNotifications(data)
        setUnreadNotifications(data.filter((notification) => !notification.isRead).length)
        setNotificationsError(null)
      } catch (error) {
        setNotificationsError(translationRef.current('cannotLoadNotifications'))
        console.error('Unable to refresh notifications', error)
      } finally {
        loading = false
      }
    }

    const notificationsUpdated = (event: Event) => {
      const updatedNotifications = (event as CustomEvent<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string; link: string | null }>>).detail
      if (!Array.isArray(updatedNotifications)) return
      setNotifications(updatedNotifications)
      setUnreadNotifications(updatedNotifications.filter((notification) => !notification.isRead).length)
      setNotificationsError(null)
    }
    const refreshNotifications = () => void loadNotifications(true)
    const loadNotificationsOnFocus = () => void loadNotifications()
    const loadNotificationsOnVisibilityChange = () => void loadNotifications()
    window.addEventListener('paysmart:notifications-updated', notificationsUpdated)
    if (!isNotificationsPage) {
      void loadNotifications()
      intervalId = window.setInterval(loadNotifications, 30_000)
      window.addEventListener('focus', loadNotificationsOnFocus)
      window.addEventListener('paysmart:notifications-refresh', refreshNotifications)
      document.addEventListener('visibilitychange', loadNotificationsOnVisibilityChange)
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
      window.removeEventListener('paysmart:notifications-updated', notificationsUpdated)
      if (!isNotificationsPage) {
        window.removeEventListener('focus', loadNotificationsOnFocus)
        window.removeEventListener('paysmart:notifications-refresh', refreshNotifications)
        document.removeEventListener('visibilitychange', loadNotificationsOnVisibilityChange)
      }
    }
  }, [user?.id, isNotificationsPage])

  const navItems = [
    { icon: BarChart3, label: t('overview'), href: ROUTES.DASHBOARD },
    { icon: CreditCard, label: t('payments'), href: ROUTES.PAYMENTS },
    { icon: User, label: t('profile'), href: ROUTES.PROFILE },
    { icon: WalletIcon, label: t('wallet'), href: ROUTES.WALLET },
    { icon: Shield, label: user?.role === 'MERCHANT' ? t('verificationKycKyb') : t('verificationKyc'), href: ROUTES.KYC },
    ...(user?.role === 'ADMIN' ? [{ icon: AlertTriangle, label: t('fraudAlerts'), href: ROUTES.ADMIN_FRAUD }] : []),
    ...(user?.role === 'ADMIN' ? [{ icon: Shield, label: t('securityRules'), href: ROUTES.ADMIN_SECURITY_RULES }] : []),
    { icon: Settings, label: t('settings'), href: '/settings' },
    ...(user?.role === 'ADMIN' ? [{ icon: UsersIcon, label: t('users'), href: ROUTES.ADMIN_USERS }] : []),
  ]

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 text-black">
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
            <img src={logo} alt={t('paysmart')} className="h-9 w-auto max-w-36 object-contain" />
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
                      ? 'border-gray-400 bg-primary-600/15 text-black shadow-[inset_3px_0_0_#3b82f6]'
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
            {user?.avatarUrl ? <img src={profileService.assetUrl(user.avatarUrl)} alt={`${user.firstName} ${user.lastName}`} onError={() => { void profileService.clearAvatar(); updateUser({ ...user, avatarUrl: null }) }} className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-black">{initials || '?'}</div>}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-black">{user?.firstName} {user?.lastName}</p>
               <p className="truncate text-xs text-black">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-black transition-colors hover:bg-blue-500/10"
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-sm shadow-slate-900/5 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={t('openMenu')}
              className="rounded-md p-2 text-black hover:bg-gray-200 hover:text-black lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <img src={logo} alt={t('paysmart')} className="h-8 w-auto max-w-32 object-contain sm:hidden" />
          </div>

          <div className="relative flex items-center gap-2 sm:gap-4">
             <button type="button" aria-label={t('notifications')} title={t('notifications')} onClick={() => void openNotifications()} className="relative rounded-md p-2 text-black hover:bg-gray-200 hover:text-black">
              <Bell size={20} />
              {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-500 px-1 text-center text-xs leading-4 text-black">{unreadNotifications}</span>}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
                  <p className="text-sm font-semibold text-black">{t('notifications')}</p>
                   <span className="text-xs text-black">{notifications.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificationsError && (
                    <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                      <p>{notificationsError}</p>
                      <button type="button" onClick={() => window.dispatchEvent(new Event('paysmart:notifications-refresh'))} className="mt-2 font-semibold underline underline-offset-2">{t('retry')}</button>
                    </div>
                  )}
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
                         <a href={getNotificationActionUrl(notification.link)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary-600 underline underline-offset-2">
                           {t('openAction') ?? 'Ouvrir'}
                         </a>
                       ) : null}
                       <p className="mt-1 text-xs text-black">{new Date(notification.createdAt).toLocaleString(locale)}</p>
                     </div>
                   ))}
                </div>
                <Link to={ROUTES.NOTIFICATIONS} onClick={() => setNotificationsOpen(false)} className="block border-t border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-primary-700 hover:bg-blue-50">
                  {t('viewAllNotifications')}
                </Link>
              </div>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-black">{user?.firstName} {user?.lastName}</p>
               <p className="text-xs capitalize text-black">{user?.role}</p>
            </div>
            {user?.avatarUrl ? <img src={profileService.assetUrl(user.avatarUrl)} alt={`${user.firstName} ${user.lastName}`} onError={() => { void profileService.clearAvatar(); updateUser({ ...user, avatarUrl: null }) }} className="h-9 w-9 rounded-full object-cover sm:hidden" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-black sm:hidden">{initials || '?'}</div>}
          </div>
        </header>

        <main className="app-main p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
