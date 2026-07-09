import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CreditCard, BarChart3, LogOut, DollarSign, User } from 'lucide-react'

interface Props {
  children: ReactNode
  onLogout: () => void
}

const navItems = [
  { path: '/', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/subscriptions', label: 'Подписки', icon: CreditCard },
  { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
]

export default function Layout({ children, onLogout }: Props) {
  const location = useLocation()
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="glass fixed top-4 left-4 right-4 z-50 max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-800 no-underline">
          <DollarSign size={22} />
          SubTrack
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium no-underline transition-all ${
                  active
                    ? 'bg-white/40 text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/20'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-3">
          {user.email && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/20 text-sm text-gray-700">
              <User size={16} />
              <span className="hidden sm:inline max-w-[160px] truncate">{user.email}</span>
            </div>
          )}
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 cursor-pointer bg-transparent border-none">
            <LogOut size={18} />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-8 px-4 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  )
}
