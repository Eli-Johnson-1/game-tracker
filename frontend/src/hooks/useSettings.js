import { useContext } from 'react'
import { SettingsContext } from '../contexts/settingsContextDef'

export function useSettings() {
  return useContext(SettingsContext)
}
