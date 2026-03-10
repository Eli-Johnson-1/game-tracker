import { createContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../api/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi.getMe()
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const { data } = await authApi.login({ username, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (username, email, password) => {
    const { data } = await authApi.register({ username, email, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
