import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import api, { getApiCode } from '@/lib/api'
import type { Employee, Role } from '@/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function buildCan(role: Role | null) {
  return {
    terminateEmployee: role === 'SUPERADMIN',
    approveVacation:   role === 'SUPERADMIN',
    manageContent:     role === 'ADMIN' || role === 'SUPERADMIN',
    viewAllEmployees:  role === 'ADMIN' || role === 'SUPERADMIN',
  }
}

interface AuthContextValue {
  employee:     Employee | null
  loading:      boolean
  isAdmin:      boolean
  isSuperAdmin: boolean
  can:          ReturnType<typeof buildCan>
  authError:    string | null
}

const AuthContext = createContext<AuthContextValue>({
  employee:     null,
  loading:      true,
  isAdmin:      false,
  isSuperAdmin: false,
  can:          buildCan(null),
  authError:    null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee,  setEmployee]  = useState<Employee | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // isMounted guards against state updates after unmount (e.g. StrictMode
    // double-invoke). We intentionally allow concurrent onAuthStateChanged
    // callbacks to all proceed — Firebase fires 2-3 times during login and
    // the old callId-based stale-check caused loading to get stuck when the
    // "winning" callback's API call was slow or the earlier one was discarded.
    let isMounted = true

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!isMounted) return

      setAuthError(null)

      if (firebaseUser) {
        setLoading(true)
        try {
          const res = await api.post<{ data: Employee }>('/api/auth/me')
          if (!isMounted) return
          setEmployee(res.data.data)
        } catch (err: unknown) {
          if (!isMounted) return
          const status = (err as { response?: { status?: number } }).response?.status
          const code   = getApiCode(err)
          setEmployee(null)
          if (status === 404) {
            await auth.signOut()
            if (isMounted) setAuthError('Kontot hittades inte. Kontakta din administratör.')
          } else if (code === 'AUTH_ACCOUNT_INACTIVE') {
            await auth.signOut()
            if (isMounted) setAuthError('Ditt konto är inaktiverat. Kontakta din administratör.')
          } else {
            setAuthError('Anslutningsfel. Försök igen.')
          }
        } finally {
          if (isMounted) setLoading(false)
        }
      } else {
        setEmployee(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  if (loading) return <LoadingScreen />

  const role = employee?.role ?? null

  return (
    <AuthContext.Provider value={{
      employee,
      loading,
      isAdmin:      role === 'ADMIN' || role === 'SUPERADMIN',
      isSuperAdmin: role === 'SUPERADMIN',
      can:          buildCan(role),
      authError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
