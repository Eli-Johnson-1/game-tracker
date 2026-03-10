import { useState, useEffect, useCallback } from 'react'
import { useMsal } from '@azure/msal-react'
import { EventType, InteractionStatus } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'
import * as authApi from '../api/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const { instance, inProgress } = useMsal()
  const [user, setUser] = useState(null)
  // Only start in loading state if there's a token to verify
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'))

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    authApi.getMe()
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const callbackId = instance.addEventCallback(async (event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.idToken) {
        try {
          const { data } = await authApi.entraAuth(event.payload.idToken)
          localStorage.setItem('token', data.token)
          setUser(data.user)
        } catch (err) {
          console.error('Backend token exchange failed:', err)
        }
      }
    })
    return () => instance.removeEventCallback(callbackId)
  }, [instance])

  const signIn = useCallback(() => {
    instance.loginRedirect(loginRequest)
  }, [instance])

  const logout = useCallback(async () => {
    localStorage.removeItem('token')
    setUser(null)
    try {
      await instance.logoutRedirect()
    } catch {
      // Ignore errors
    }
  }, [instance])

  const isLoading = loading || inProgress === InteractionStatus.HandleRedirect

  return (
    <AuthContext.Provider value={{ user, loading: isLoading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
