import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getGame, deleteGame } from '../api/terraformingMars'
import { TerraformingMarsLayout } from '../components/terraforming-mars/TerraformingMarsLayout'
import { TmScoringForm } from '../components/terraforming-mars/TmScoringForm'
import { TmScoreBreakdown } from '../components/terraforming-mars/TmScoreBreakdown'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Modal } from '../components/common/Modal'

export function TerraformingMarsGamePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    getGame(id)
      .then(({ data }) => setGame(data.game))
      .catch(() => setError('Game not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await deleteGame(id)
      navigate('/terraforming-mars')
    } catch {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <TerraformingMarsLayout>
        <div className="flex justify-center py-16"><LoadingSpinner className="h-10 w-10" /></div>
      </TerraformingMarsLayout>
    )
  }

  if (error || !game) {
    return (
      <TerraformingMarsLayout>
        <p className="text-red-400">{error || 'Game not found'}</p>
      </TerraformingMarsLayout>
    )
  }

  const isCreator = user.id === game.created_by
  const playerNames = game.players.map(p => p.player_name).join(' · ')
  const date = game.created_at
    ? new Date(game.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <TerraformingMarsLayout>
      {/* Back link */}
      <Link
        to="/terraforming-mars"
        className="inline-flex items-center gap-1 text-sm mb-4 transition-colors"
        style={{ color: '#f97316' }}
      >
        ← All games
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold text-lg" style={{ fontFamily: 'Georgia, serif' }}>
            {playerNames}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {game.mode === 'solo' ? 'Solo' : 'Multiplayer'} · {date}
          </p>
        </div>
        {isCreator && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs px-2 py-1 rounded border transition-colors"
            style={{ color: '#f87171', borderColor: '#f87171' }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Complete: score breakdown + optional edit */}
      {game.status === 'complete' && !editing && (
        <>
          <TmScoreBreakdown game={game} />
          {isCreator && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm px-3 py-1.5 rounded border transition-colors mb-4"
              style={{ color: '#f97316', borderColor: '#7c2d12' }}
            >
              Edit Scores
            </button>
          )}
        </>
      )}

      {/* Edit mode: scoring form pre-populated */}
      {game.status === 'complete' && editing && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#f97316' }}>Editing scores</h3>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
          <TmScoringForm
            game={game}
            initialData={game}
            isEditing
            onCompleted={updated => { setGame(updated); setEditing(false) }}
          />
        </>
      )}

      {/* Active: scoring form (creator only) */}
      {game.status === 'active' && isCreator && (
        <TmScoringForm game={game} onCompleted={setGame} />
      )}

      {/* Active: non-creator view */}
      {game.status === 'active' && !isCreator && (
        <p className="text-sm text-center py-4" style={{ color: '#f97316' }}>
          Game in progress — only the creator can enter scores.
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
    </TerraformingMarsLayout>
  )
}
