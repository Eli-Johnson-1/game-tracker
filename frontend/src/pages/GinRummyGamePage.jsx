import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGinRummyGame } from '../hooks/useGinRummyGame'
import { GinRummyLayout } from '../components/gin-rummy/GinRummyLayout'
import { ScoreTable } from '../components/gin-rummy/ScoreTable'
import { HandEntryForm } from '../components/gin-rummy/HandEntryForm'
import { EndGameSummary } from '../components/gin-rummy/EndGameSummary'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export function GinRummyGamePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { game, hands, loading, error, endGame, onHandSubmitted } = useGinRummyGame(id)

  if (loading) {
    return (
      <GinRummyLayout>
        <div className="flex justify-center py-16"><LoadingSpinner className="h-10 w-10" /></div>
      </GinRummyLayout>
    )
  }

  if (error || !game) {
    return (
      <GinRummyLayout>
        <p className="text-red-400">{error || 'Game not found'}</p>
      </GinRummyLayout>
    )
  }

  const isParticipant = user.id === game.player1_id || user.id === game.player2_id
  const lastHand = hands.length > 0 ? hands[hands.length - 1] : null

  return (
    <GinRummyLayout>
      {/* Back link */}
      <Link
        to="/gin-rummy"
        className="inline-flex items-center gap-1 text-sm mb-4 transition-colors"
        style={{ color: '#7ab893' }}
      >
        ← All games
      </Link>

      {/* Players & date */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg" style={{ fontFamily: 'Georgia, serif' }}>
          {game.player1_username}{' '}
          <span style={{ color: '#7ab893' }}>vs</span>{' '}
          {game.player2_username}
        </h2>
        <span className="text-xs" style={{ color: '#7ab893' }}>
          {game.imported
            ? 'Historical'
            : new Date(game.started_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
        </span>
      </div>

      {/* End-game summary (if complete) */}
      <EndGameSummary game={game} endGame={endGame} />

      {/* Score table */}
      {hands.length > 0 && (
        <div className="mb-4">
          <ScoreTable game={game} hands={hands} />
        </div>
      )}

      {/* Hand entry form (only for participants, only if active) */}
      {isParticipant && game.status === 'active' && (
        <HandEntryForm
          game={game}
          lastHandId={lastHand?.id}
          onHandSubmitted={onHandSubmitted}
        />
      )}

      {/* Non-participant view of active game */}
      {!isParticipant && game.status === 'active' && (
        <p className="text-sm text-center py-4" style={{ color: '#7ab893' }}>
          Game in progress — only participants can enter scores.
        </p>
      )}
    </GinRummyLayout>
  )
}
