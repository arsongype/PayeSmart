import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users as UsersIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import type { User } from '../../models/User.model'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../../components/common/Loader'
import { Button } from '../../components/common/Button'

type Role = 'USER' | 'MERCHANT' | 'ADMIN'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
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
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs')
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du rôle')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <FullPageLoader />
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary-500" />
            <h1 className="text-2xl font-bold text-dark-50">Gestion des utilisateurs</h1>
          </div>
          <p className="text-dark-400">Gérez les rôles et les accès des utilisateurs de la plateforme.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Utilisateur</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Rôle</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">KYC</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-dark-200">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-dark-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          disabled={updatingId === user.id || user.id === currentUser?.id}
                          className="appearance-none bg-dark-900 border border-dark-700 text-dark-100 text-sm rounded-lg px-3 py-2 pr-8 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="USER">USER</option>
                          <option value="MERCHANT">MERCHANT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.kycStatus === 'VERIFIE' || user.kycStatus === 'APPROVED'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : user.kycStatus === 'EN_COURS'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                              : 'bg-dark-700 text-dark-400 border border-dark-600'
                        }`}
                      >
                        {user.kycStatus}{user.role === 'MERCHANT' ? ` / KYB: ${user.kybStatus}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="text-xs"
                        >
                          Détail
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadUsers}
                            className="text-xs"
                          >
                            Actualiser
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-dark-500">
                      <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun utilisateur trouvé</p>
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
