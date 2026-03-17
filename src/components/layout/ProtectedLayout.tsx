import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageTransition } from '@/components/ui/PageTransition'

// Guards: must be logged in
export function ProtectedLayout() {
  const { employee } = useAuth()
  const location     = useLocation()

  if (!employee) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}

// Guards: must be ADMIN
export function AdminLayout() {
  const { isAdmin } = useAuth()

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
