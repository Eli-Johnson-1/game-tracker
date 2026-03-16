import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ChupLab Game Tracker` : 'ChupLab Game Tracker'
    return () => { document.title = 'ChupLab Game Tracker' }
  }, [title])
}
