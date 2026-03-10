import { createContext, useState, useEffect, useContext, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import { getSettings } from '../api/settings'

export const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { user } = useContext(AuthContext)
  const [settings, setSettings] = useState({})

  const fetchSettings = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await getSettings()
      // Convert {key: {value, description}} → {key: parsedValue}
      const parsed = {}
      for (const [k, v] of Object.entries(data.settings)) {
        const raw = v.value
        if (raw === 'true') parsed[k] = true
        else if (raw === 'false') parsed[k] = false
        else if (!isNaN(raw)) parsed[k] = Number(raw)
        else parsed[k] = raw
      }
      setSettings(parsed)
    } catch {
      // non-critical — defaults still work
    }
  }, [user])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  return (
    <SettingsContext.Provider value={{ settings, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
