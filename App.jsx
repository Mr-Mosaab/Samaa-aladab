import { useState } from 'react'
import { isConfigured } from './supabaseClient'
import SetupScreen from './components/SetupScreen'
import RegisterPage from './components/RegisterPage'
import StatsPage from './components/StatsPage'
import AdminPage from './components/AdminPage'
import { BottomNav, Toast } from './components/Shared'

export default function App() {
  const [configured, setConfigured] = useState(isConfigured())
  const [page, setPage] = useState('register')
  const [toast, setToast] = useState('')

  if (!configured) {
    return <SetupScreen onDone={() => setConfigured(true)} />
  }

  const notify = (msg) => setToast(msg)

  return (
    <>
      {page === 'register' && <RegisterPage key="reg" notify={notify} />}
      {page === 'stats' && <StatsPage key="stats" />}
      {page === 'admin' && <AdminPage key="admin" notify={notify} />}

      <BottomNav page={page} setPage={setPage} />
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  )
}
