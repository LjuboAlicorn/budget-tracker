import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Analytics from './pages/Analytics'
import ImportCSV from './pages/ImportCSV'
import Households from './pages/Households'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()

  if (token) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  const { loadUser, token } = useAuthStore()

  useEffect(() => {
    if (token) {
      loadUser()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><ImportCSV /></ProtectedRoute>} />
        <Route path="/households" element={<ProtectedRoute><Households /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
