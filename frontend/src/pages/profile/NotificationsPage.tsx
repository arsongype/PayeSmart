import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { apiClient } from '../../config/axios.config'
import { FullPageLoader } from '../../components/common/Loader'
import { useTranslation } from '../../utils/i18n'

type Notification = {
  id: number
  title: string
  message: string
  isRead: boolean
  createdAt: string
  link?: string
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get<Notification[]>('/notifications')
        setNotifications(data)
      } catch {
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const markAsRead = async (id: number) => {
    await apiClient.patch(`/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
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
                  className={`p-4 transition hover:bg-gray-100 cursor-pointer ${n.isRead ? 'opacity-70' : 'bg-white'}`}
                  onClick={() => !n.isRead && markAsRead(n.id)}
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
                    <a href={n.link} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
                      {t('openAction')}
                    </a>
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
