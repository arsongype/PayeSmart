import { useState, useEffect, useRef, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CircleAlert } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { apiClient } from '../../config/axios.config'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'

type Notification = {
  id: number
  title: string
  message: string
  isRead: boolean
  createdAt: string
  link?: string | null
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const translationRef = useRef(t)
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    translationRef.current = t
  }, [t])

  useEffect(() => {
    let mounted = true
    let loading = false
    let lastRequestAt = 0
    const load = async (force = false) => {
      if (loading || document.visibilityState === 'hidden' || (!force && Date.now() - lastRequestAt < 30_000)) return
      loading = true
      lastRequestAt = Date.now()
      try {
        const { data: loadedNotifications } = await apiClient.get<Notification[]>('/notifications')
        let data = loadedNotifications
        let readError: string | null = null
        if (loadedNotifications.some((notification) => !notification.isRead)) {
          try {
            const response = await apiClient.patch<Notification[]>('/notifications/read-all')
            data = response.data
          } catch (error) {
            readError = error instanceof Error ? error.message : translationRef.current('cannotMarkNotificationRead')
            console.error('Unable to mark notifications as read', error)
          }
        }
        if (mounted) {
          setNotifications(data)
          setError(readError)
          window.dispatchEvent(new CustomEvent('paysmart:notifications-updated', { detail: data }))
        }
      } catch (error) {
        if (mounted) setError(error instanceof Error ? error.message : translationRef.current('cannotLoadNotifications'))
        console.error('Unable to refresh notifications', error)
      } finally {
        loading = false
        if (mounted) setLoading(false)
      }
    }
    const refreshNotifications = () => void load(true)
    const loadNotificationsOnFocus = () => void load()
    const loadNotificationsOnVisibilityChange = () => void load()
    void load()
    const intervalId = window.setInterval(() => void load(), 30_000)
    window.addEventListener('focus', loadNotificationsOnFocus)
    document.addEventListener('visibilitychange', loadNotificationsOnVisibilityChange)
    window.addEventListener('paysmart:notifications-refresh', refreshNotifications)
    return () => {
      mounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', loadNotificationsOnFocus)
      document.removeEventListener('visibilitychange', loadNotificationsOnVisibilityChange)
      window.removeEventListener('paysmart:notifications-refresh', refreshNotifications)
    }
  }, [])

  const markAsRead = async (id: number): Promise<boolean> => {
    try {
      const { data } = await apiClient.patch<Notification[]>(`/notifications/${id}/read`)
      setNotifications(data)
      setError(null)
      window.dispatchEvent(new CustomEvent('paysmart:notifications-updated', { detail: data }))
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : translationRef.current('cannotMarkNotificationRead'))
      console.error('Unable to mark notification as read', error)
      return false
    }
  }

  const openNotificationLink = async (event: MouseEvent<HTMLAnchorElement>, notification: Notification) => {
    if (!notification.link) return
    event.preventDefault()
    if (!notification.isRead && !await markAsRead(notification.id)) return

    const target = new URL(notification.link, window.location.origin)
    if (target.origin === window.location.origin) {
      navigate(`${target.pathname}${target.search}${target.hash}`)
    } else {
      window.location.assign(target.href)
    }
  }

  if (loading) return <FullPageLoader />

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
            <Bell className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-black">{t('notifications')}</h1>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-3xl border border-gray-300 bg-gray-50 shadow-lg shadow-black/20 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-black">
              <p className="text-base">{t('noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition hover:bg-gray-100 ${n.isRead ? 'opacity-70' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium text-black">{n.title}</p>
                      <p className="text-sm text-black">{n.message}</p>
                      <p className="text-xs text-black mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-600 shrink-0" />}
                  </div>
                  {n.link && (
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {n.link.includes('/payments/confirm/') && (
                        <QRCodeSVG value={n.link} size={120} level="M" includeMargin />
                      )}
                      <a href={n.link} onClick={(event) => void openNotificationLink(event, n)} className="inline-block text-sm font-medium text-primary-600 hover:underline">
                        {t('openAction')}
                      </a>
                    </div>
                  )}
                  {!n.isRead && (
                    <button type="button" onClick={() => void markAsRead(n.id)} className="mt-3 text-xs font-semibold text-primary-700 hover:underline">
                      {t('markAsRead')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
