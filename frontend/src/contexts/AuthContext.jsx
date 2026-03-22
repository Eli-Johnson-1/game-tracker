import { useState, useEffect, useCallback } from 'react'
import { useMsal } from '@azure/msal-react'
import { EventType, InteractionStatus } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'
import * as authApi from '../api/auth'
import { AuthContext } from './authContextDef'

export function AuthProvider({ children }) {
  const { instance, inProgress } = useMsal()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const accounts = instance.getAllAccounts()

    if (token) {
      authApi.getMe()
        .then(({ data }) => setUser(data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
      return
    }

    if (accounts.length > 0) {
      // Redirect was processed before React mounted — recover via silent token acquisition
      instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] })
        .then(async (response) => {
          const { data } = await authApi.entraAuth(response.idToken)
          localStorage.setItem('token', data.token)
          setUser(data.user)
        })
        .catch(err => console.warn('MSAL silent token acquisition failed:', err))
        .finally(() => setLoading(false))
      return
    }

    Promise.resolve().then(() => setLoading(false))
  }, [instance])

  // Keep event callback for future sign-ins (button clicks)
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
