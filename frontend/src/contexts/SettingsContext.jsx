import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getSettings } from '../api/settings'
import { SettingsContext } from './settingsContextDef'

function parseSettings(data) {
  const parsed = {}
  for (const [k, v] of Object.entries(data.settings)) {
    const raw = v.value
    if (raw === 'true') parsed[k] = true
    else if (raw === 'false') parsed[k] = false
    else if (!isNaN(raw)) parsed[k] = Number(raw)
    else parsed[k] = raw
  }
  return parsed
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState({})

  useEffect(() => {
    if (!user) return
    getSettings()
      .then(({ data }) => setSettings(parseSettings(data)))
      .catch(() => {})
  }, [user])

  const refetch = useCallback(() => {
    getSettings()
      .then(({ data }) => setSettings(parseSettings(data)))
      .catch(() => {})
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, refetch }}>
      {children}
    </SettingsContext.Provider>
  )
}
