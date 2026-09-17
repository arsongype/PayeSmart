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

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string }>>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    apiClient.get<Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string }>>('/notifications')
      .then(({ data }) => {
        setNotifications(data)
        setUnreadNotifications(data.filter((notification) => !notification.isRead).length)
      })
      .catch(() => undefined)
  }, [])

  const navItems = [
    { icon: BarChart3, label: "Vue d'ensemble", href: ROUTES.DASHBOARD },
    { icon: CreditCard, label: 'Paiements', href: ROUTES.PAYMENTS },
    { icon: User, label: 'Profil', href: ROUTES.PROFILE },
    { icon: WalletIcon, label: 'Portefeuille', href: ROUTES.WALLET },
    { icon: Shield, label: user?.role === 'MERCHANT' ? 'Vérification KYC / KYB' : 'Vérification KYC', href: ROUTES.KYC },
    ...(user?.role === 'ADMIN' ? [{ icon: AlertTriangle, label: 'Alertes fraude', href: ROUTES.ADMIN_FRAUD }] : []),
    { icon: Settings, label: 'Paramètres', href: '/settings' },
    ...(user?.role === 'ADMIN' ? [{ icon: UsersIcon, label: 'Utilisateurs', href: ROUTES.ADMIN_USERS }] : []),
  ]

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-dark-700 bg-dark-800 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-dark-700 px-5">
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2" aria-label="Paysmart, accueil">
            <Shield className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">Paysmart</span>
          </Link>
          <button
            type="button"
            aria-label="Fermer le menu"
            className="rounded-md p-2 text-dark-400 hover:bg-dark-700 hover:text-dark-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label="Navigation principale">
          <div className="space-y-1">
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
                      ? 'border-primary-600/30 bg-primary-600/10 text-primary-400'
                      : 'border-transparent text-dark-400 hover:bg-dark-700/60 hover:text-dark-100'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-dark-700 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-dark-100">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-dark-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-dark-700 bg-dark-800/95 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              className="rounded-md p-2 text-dark-400 hover:bg-dark-700 hover:text-dark-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden items-center gap-2 rounded-lg bg-dark-900/60 px-3 py-1.5 sm:flex">
              <Search size={16} className="text-dark-500" />
              <input
                type="search"
                placeholder="Rechercher..."
                aria-label="Rechercher"
                className="w-40 bg-transparent text-sm text-dark-200 outline-none placeholder:text-dark-500 sm:w-56"
              />
            </div>
            <p className="truncate text-sm font-medium text-dark-200 sm:hidden">Paysmart</p>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-4">
            <button type="button" aria-label="Notifications" title="Notifications" onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-md p-2 text-dark-400 hover:bg-dark-700 hover:text-dark-100">
              <Bell size={20} />
              {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 text-white">{unreadNotifications}</span>}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-dark-600 bg-dark-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
                  <p className="text-sm font-semibold text-dark-100">Notifications</p>
                  <span className="text-xs text-dark-500">{notifications.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-dark-500">Aucune notification</p>
                  ) : notifications.slice(0, 8).map((notification) => (
                    <div key={notification.id} className="border-b border-dark-700/70 px-4 py-3 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-dark-100">{notification.title}</p>
                        {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-400" aria-label="Non lu" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-dark-300">{notification.message}</p>
                      <p className="mt-1 text-[10px] text-dark-500">{new Date(notification.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-dark-200">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs capitalize text-dark-500">{user?.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white sm:hidden">
              {initials || '?'}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}