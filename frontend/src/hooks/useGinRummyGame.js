import { useState, useEffect, useCallback } from 'react'
import { getGame } from '../api/ginRummy'

export function useGinRummyGame(gameId) {
  const [game, setGame]   = useState(null)
  const [hands, setHands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [endGame, setEndGame] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getGame(gameId)
      setGame(data.game)
      setHands(data.hands)
      if (data.end_game) setEndGame(data.end_game)
    } catch {
      setError('Failed to load game')
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => { fetch() }, [fetch])

  function onHandSubmitted(data) {
    if (data === null) {
      // undo — refetch
      fetch()
      return
    }
    setHands(prev => [...prev, data.hand])
    if (data.end_game) {
      setEndGame(data.end_game)
      // Refetch to get the updated game record (final scores, winner, status)
      fetch()
    }
  }

  return { game, hands, loading, error, endGame, setEndGame, onHandSubmitted, refetch: fetch }
}
