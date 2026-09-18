import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users as UsersIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import type { User } from '../../models/User.model'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'
import { useTranslation } from '../../utils/i18n'

type Role = 'USER' | 'MERCHANT' | 'ADMIN'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminService.getUsers()
      setUsers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoadingUsers'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      await loadUsers()
      if (!isMounted) setLoading(false)
    }
    init()
    return () => {
      isMounted = false
    }
  }, [])

  const handleRoleChange = async (userId: number, newRole: Role) => {
    try {
      setUpdatingId(userId)
      await adminService.updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorUpdatingRole'))
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <FullPageLoader />
  }

  return (
    <div className="page-enter min-h-screen bg-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-2xl bg-primary-500/10 p-2.5 text-black">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-black">{t('userManagement')}</h1>
          </div>
          <p className="text-lg text-black">{t('manageRoles')}</p>
        </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-4 text-base text-black">
              {error}
            </div>
          )}

        <div className="rounded-3xl border border-gray-300 bg-gray-50 shadow-lg shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                   <th className="text-left px-6 py-4 text-base font-medium text-black">{t('user')}</th>
                   <th className="text-left px-6 py-4 text-base font-medium text-black">{t('email')}</th>
                   <th className="text-left px-6 py-4 text-base font-medium text-black">{t('role')}</th>
                   <th className="text-left px-6 py-4 text-base font-medium text-black">{t('kyc')}</th>
                   <th className="text-right px-6 py-4 text-base font-medium text-black">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-black font-medium text-sm">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-base font-medium text-black">
                            {u.firstName} {u.lastName}
                          </p>
                           <p className="text-sm text-black">{t('userId', { id: u.id })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-base text-black">{u.email}</td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          disabled={updatingId === u.id || u.id === currentUser?.id}
                          className="appearance-none bg-white border border-gray-300 text-black text-sm rounded-xl px-3 py-2 pr-8 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="USER">USER</option>
                          <option value="MERCHANT">MERCHANT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                         <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
                          u.kycStatus === 'VERIFIE' || u.kycStatus === 'APPROVED'
                            ? 'bg-emerald-500/10 text-black border border-emerald-500/30'
                            : u.kycStatus === 'EN_COURS'
                              ? 'bg-amber-500/10 text-black border border-amber-500/30'
                               : 'bg-gray-200 text-black border border-gray-200'
                        }`}
                      >
                        {u.kycStatus}{u.role === 'MERCHANT' ? ` / ${t('kyb')}: ${u.kybStatus}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            className="text-sm rounded-xl border border-gray-300"
                          >
                            {t('detail')}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={loadUsers}
                              className="text-sm rounded-xl border border-gray-300"
                            >
                              {t('refresh')}
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-black">
                      <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-base">{t('userNotFound')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}



