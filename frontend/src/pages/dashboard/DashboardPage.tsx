import { useAuth } from '../../contexts/AuthContext'
import {
  CreditCard,
  ChevronRight,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-dark-50">Vue d'ensemble</h1>
            <p className="text-dark-400 mt-1">Bienvenue, {user?.firstName} ! Voici un aperçu de votre activité.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Transactions en attente', value: '37', change: '+3', positive: false },
              { label: 'Montant total', value: '€31,940', change: '+12%', positive: true },
              { label: 'Temps moyen', value: '6 min', change: '-2 min', positive: true },
              { label: 'SLA dépassé', value: '11', change: '+2', positive: false },
            ].map((stat) => (
              <div key={stat.label} className="bg-dark-800 border border-dark-700 rounded-xl p-6">
                <p className="text-sm text-dark-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-dark-50">{stat.value}</p>
                <p className={`text-sm mt-2 ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-dark-50">Transactions récentes</h2>
              <button className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                Voir tout <ChevronRight size={16} />
              </button>
            </div>
            <div className="text-center py-12 text-dark-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Les transactions apparaîtront ici</p>
            </div>
          </div>
    </>
  )
}
