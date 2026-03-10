import { useContext } from 'react'
import { AuthContext } from '../contexts/authContextDef'

export function useAuth() {
  return useContext(AuthContext)
}
