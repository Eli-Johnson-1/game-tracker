import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGinRummyGame } from '../hooks/useGinRummyGame'
import { usePageTitle } from '../hooks/usePageTitle'
import { deleteGame } from '../api/ginRummy'
import { GinRummyLayout } from '../components/gin-rummy/GinRummyLayout'
import { ScoreTable } from '../components/gin-rummy/ScoreTable'
import { HandEntryForm } from '../components/gin-rummy/HandEntryForm'
import { EndGameSummary } from '../components/gin-rummy/EndGameSummary'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Modal } from '../components/common/Modal'

export function GinRummyGamePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { game, hands, loading, error, endGame, onHandSubmitted } = useGinRummyGame(id)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  usePageTitle(game ? `${game.player1_username} vs ${game.player2_username}` : 'Gin Rummy Game')

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await deleteGame(id)
      navigate('/gin-rummy')
    } catch {
      setDeleting(false)
    }
  }

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
  const canDelete = isParticipant || user.is_admin
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-white font-semibold text-lg" style={{ fontFamily: 'Georgia, serif' }}>
          {game.player1_username}{' '}
          <span style={{ color: '#7ab893' }}>vs</span>{' '}
          {game.player2_username}
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs" style={{ color: '#7ab893' }}>
            {game.imported
              ? 'Historical'
              : new Date(game.started_at).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
          </span>
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-xs px-2 py-1 rounded border transition-colors"
              style={{ color: '#f87171', borderColor: '#f87171' }}
            >
              Delete
            </button>
          )}
        </div>
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

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Game"
      >
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this game? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </GinRummyLayout>
  )
}
