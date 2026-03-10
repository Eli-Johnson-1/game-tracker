import { useState, useEffect } from 'react'
import { GinRummyLayout } from '../components/gin-rummy/GinRummyLayout'
import { GinLeaderboard } from '../components/gin-rummy/GinLeaderboard'
import { GamesList } from '../components/gin-rummy/GamesList'
import { NewGameModal } from '../components/gin-rummy/NewGameModal'
import { Button } from '../components/common/Button'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { listGames } from '../api/ginRummy'

export function GinRummyPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    listGames()
      .then(({ data }) => setGames(data.games))
      .finally(() => setLoading(false))
  }, [])

  function onGameCreated(game) {
    setGames(prev => [{ ...game, hand_count: 0 }, ...prev])
  }

  return (
    <GinRummyLayout>
      <GinLeaderboard />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#7ab893' }}>
          Games
        </h2>
        <Button size="sm" onClick={() => setShowNew(true)}>
          + New game
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <GamesList games={games} />
      )}

      <NewGameModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={onGameCreated}
      />
    </GinRummyLayout>
  )
}
