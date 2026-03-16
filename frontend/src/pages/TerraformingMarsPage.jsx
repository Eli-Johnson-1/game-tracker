import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TerraformingMarsLayout } from '../components/terraforming-mars/TerraformingMarsLayout'
import { TmLeaderboard } from '../components/terraforming-mars/TmLeaderboard'
import { TmGamesList } from '../components/terraforming-mars/TmGamesList'
import { NewTmGameModal } from '../components/terraforming-mars/NewTmGameModal'
import { Button } from '../components/common/Button'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { listGames } from '../api/terraformingMars'
import { usePageTitle } from '../hooks/usePageTitle'

export function TerraformingMarsPage() {
  usePageTitle('Terraforming Mars')
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    listGames()
      .then(({ data }) => setGames(data.games))
      .finally(() => setLoading(false))
  }, [])

  function onGameCreated(game) {
    navigate(`/terraforming-mars/games/${game.id}`)
  }

  return (
    <TerraformingMarsLayout>
      <TmLeaderboard />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>
          Games
        </h2>
        <Button size="sm" onClick={() => setShowNew(true)}>
          + New game
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <TmGamesList games={games} />
      )}

      <NewTmGameModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={onGameCreated}
      />
    </TerraformingMarsLayout>
  )
}
