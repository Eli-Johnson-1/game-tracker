import { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { ErrorMessage } from '../common/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { listUsers } from '../../api/users'
import { createGame } from '../../api/ginRummy'

export function NewGameModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [opponentId, setOpponentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    listUsers().then(({ data }) => {
      setUsers(data.users.filter(u => u.id !== user.id))
    }).catch(() => {})
  }, [open, user])

  async function handleCreate() {
    if (!opponentId) return
    setError('')
    setLoading(true)
    try {
      const { data } = await createGame({ opponent_id: opponentId })
      onCreated(data.game)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Gin Rummy Game">
      <div className="space-y-4">
        <ErrorMessage message={error} />
        <div>
          <label className="block text-sm text-gray-300 mb-2">Select opponent</label>
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">No other players registered yet.</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="opponent"
                    value={u.id}
                    checked={opponentId === String(u.id)}
                    onChange={() => setOpponentId(String(u.id))}
                    className="accent-emerald-500"
                  />
                  <span className="text-white group-hover:text-emerald-300 transition-colors">
                    {u.username}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleCreate} disabled={!opponentId || loading}>
            {loading ? 'Starting…' : 'Start game'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
