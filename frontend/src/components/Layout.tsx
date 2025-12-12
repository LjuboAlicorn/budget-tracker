import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Button } from './ui/button'
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  LogOut,
  Menu,
  X,
  Wallet,
  Moon,
  Sun,
  Upload,
  Users,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { path: '/', label: 'Pregled', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transakcije', icon: Receipt },
  { path: '/budgets', label: 'Budžeti', icon: PiggyBank },
  { path: '/analytics', label: 'Analitika', icon: BarChart3 },
  { path: '/import', label: 'Uvoz CSV', icon: Upload },
  { path: '/households', label: 'Domaćinstva', icon: Users },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold">Budget Tracker</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out z-40
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-6 border-b">
            <Wallet className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Budget Tracker</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User & Theme */}
          <div className="p-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tema</span>
              <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Odjavi se
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
