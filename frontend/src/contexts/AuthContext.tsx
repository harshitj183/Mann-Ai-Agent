import { createContext, useContext, useState, type ReactNode } from 'react'

interface User {
  id: number
  name: string
  email: string
  avatar: string | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<string | null>
  signup: (name: string, email: string, password: string) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = 'http://localhost:5000/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) return data.message || 'Login failed'

      localStorage.removeItem('token')
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      setUser(data.user)
      return null
    } catch {
      return 'Network error. Is the API gateway running?'
    }
  }

  const signup = async (name: string, email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok) return data.message || 'Signup failed'

      localStorage.removeItem('token')
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      setUser(data.user)
      return null
    } catch {
      return 'Network error. Is the API gateway running?'
    }
  }

  const logout = () => {
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const data = useContext(AuthContext)
  if (!data) throw new Error('useAuth must be used within AuthProvider')
  return data
}
