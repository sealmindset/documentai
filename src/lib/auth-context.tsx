'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

// Matches the JWT payload from /api/auth/me
export interface AuthMe {
  sub: string
  email: string
  name: string
  role_id: string
  role_name: string
  permissions: string[]
}

interface AuthContextType {
  user: AuthMe | null
  loading: boolean
  logout: () => Promise<void>
  hasPermission: (resource: string, action: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  hasPermission: () => false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data) => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
      })
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
  }

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false
    return user.permissions.includes(`${resource}.${action}`)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
