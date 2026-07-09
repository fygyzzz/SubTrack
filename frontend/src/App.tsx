import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import Layout from './components/Layout'
import { useBrowserNotifications } from './hooks/useBrowserNotifications'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem('token'))
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return <AuthenticatedApp onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null) }} />
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  useBrowserNotifications()

  return (
    <Layout onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
