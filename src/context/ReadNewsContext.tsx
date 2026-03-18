import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface ReadNewsContextValue {
  isRead:     (id: string) => boolean
  markAsRead: (id: string) => void
}

const ReadNewsContext = createContext<ReadNewsContextValue>({
  isRead:     () => true,
  markAsRead: () => void 0,
})

function storageKey(userId: string) {
  return `read_news_${userId}`
}

function loadReadIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function ReadNewsProvider({ children }: { children: ReactNode }) {
  const { employee } = useAuth()
  const key = employee ? storageKey(employee.id) : null

  const [readIds, setReadIds] = useState<Set<string>>(() =>
    key ? loadReadIds(key) : new Set()
  )

  const markAsRead = useCallback((id: string) => {
    if (!key) return
    setReadIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(key, JSON.stringify([...next]))
      return next
    })
  }, [key])

  const isRead = useCallback((id: string) => readIds.has(id), [readIds])

  return (
    <ReadNewsContext.Provider value={{ isRead, markAsRead }}>
      {children}
    </ReadNewsContext.Provider>
  )
}

export const useReadNews = () => useContext(ReadNewsContext)
