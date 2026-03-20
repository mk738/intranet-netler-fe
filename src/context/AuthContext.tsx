import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import api, { getApiCode } from '@/lib/api'
import type { Employee } from '@/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface AuthContextValue {
  employee:  Employee | null
  loading:   boolean
  isAdmin:   boolean
  authError: string | null
}

const AuthContext = createContext<AuthContextValue>({
  employee:  null,
  loading:   true,
  isAdmin:   false,
  authError: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee,  setEmployee]  = useState<Employee | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Counter to discard stale callbacks — onAuthStateChanged can fire
    // multiple times in quick succession during Google sign-in (token refresh),
    // causing a race where loading gets stuck true indefinitely.
    let callId = 0

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      const currentId = ++callId

      setAuthError(null)

      if (firebaseUser) {
        setLoading(true)
        try {
          const res = await api.post<{ data: Employee }>('/api/auth/me')
          if (currentId !== callId) return
          setEmployee(res.data.data)
        } catch (err: unknown) {
          if (currentId !== callId) return
          const status = (err as { response?: { status?: number } }).response?.status
          const code   = getApiCode(err)
          setEmployee(null)
          if (status === 404) {
            await auth.signOut()
            setAuthError('Kontot hittades inte. Kontakta din administratör.')
          } else if (code === 'AUTH_ACCOUNT_INACTIVE') {
            await auth.signOut()
            setAuthError('Ditt konto är inaktiverat. Kontakta din administratör.')
          } else {
            setAuthError('Anslutningsfel. Försök igen.')
          }
        }
      } else {
        if (currentId !== callId) return
        setEmployee(null)
      }

      if (currentId !== callId) return
      setLoading(false)
    })

    return () => {
      callId = Infinity
      unsubscribe()
    }
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <AuthContext.Provider value={{
      employee,
      loading,
      isAdmin: employee?.role === 'ADMIN',
      authError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
