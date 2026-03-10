import { useState } from 'react'
import { Button } from '../common/Button'
import { ErrorMessage } from '../common/ErrorMessage'
import { submitHand, undoLastHand } from '../../api/ginRummy'
import { useAuth } from '../../hooks/useAuth'

const TABS = [
  { id: 'knock',   label: '✊ Knock',   desc: 'You knocked with ≤10 deadwood' },
  { id: 'gin',     label: '♠ Gin',     desc: 'All cards melded (10 cards)' },
  { id: 'big_gin', label: '★ Big Gin', desc: 'All 11 cards melded (no discard)' },
]

export function HandEntryForm({ game, lastHandId, onHandSubmitted }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('knock')
  const [knockerId, setKnockerId] = useState(String(user.id))
  const [knockerDw, setKnockerDw] = useState('')
  const [defenderDw, setDefenderDw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [undoing, setUndoing] = useState(false)

  const p1 = { id: game.player1_id, name: game.player1_username }
  const p2 = { id: game.player2_id, name: game.player2_username }
  const players = [p1, p2]

  const knocker = players.find(p => String(p.id) === String(knockerId))
  const defender = players.find(p => String(p.id) !== String(knockerId))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { hand_type: tab }

      if (tab === 'knock') {
        payload.knocker_id = Number(knockerId)
        payload.knocker_deadwood = Number(knockerDw)
        payload.defender_deadwood = Number(defenderDw)
      } else {
        // gin or big_gin: the "knocker" is the gin player
        payload.knocker_id = Number(knockerId)
        payload.defender_deadwood = Number(defenderDw)
      }

      const { data } = await submitHand(game.id, payload)
      setKnockerDw('')
      setDefenderDw('')
      onHandSubmitted(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit hand')
    } finally {
      setLoading(false)
    }
  }

  async function handleUndo() {
    if (!lastHandId) return
    setUndoing(true)
    try {
      await undoLastHand(game.id, lastHandId)
      onHandSubmitted(null) // signal to parent to refetch
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to undo')
    } finally {
      setUndoing(false)
    }
  }

  return (
    <div className="rounded-xl border p-4"
      style={{ backgroundColor: '#162a1e', borderColor: '#2d5a40' }}>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#7ab893' }}>
        Enter Hand Result
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setError('') }}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            style={tab === t.id ? { backgroundColor: '#2d5a40' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs mb-4" style={{ color: '#7ab893' }}>
        {TABS.find(t => t.id === tab)?.desc}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        {/* Who knocked / went gin */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            {tab === 'knock' ? 'Who knocked?' : 'Who went ' + tab.replace('_', ' ') + '?'}
          </label>
          <div className="flex gap-2">
            {players.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setKnockerId(String(p.id))}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  String(knockerId) === String(p.id)
                    ? 'text-white border-emerald-500'
                    : 'text-gray-400 border-gray-600 hover:border-gray-500'
                }`}
                style={String(knockerId) === String(p.id) ? { backgroundColor: '#2d5a40' } : {}}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Deadwood inputs */}
        <div className={`grid gap-3 ${tab === 'knock' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {tab === 'knock' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                {knocker?.name}'s deadwood (0–10)
              </label>
              <input
                type="number"
                value={knockerDw}
                onChange={e => setKnockerDw(e.target.value)}
                min={0}
                max={10}
                required
                placeholder="0–10"
                className="w-full rounded-lg px-3 py-2 text-white text-center text-lg font-bold focus:outline-none border"
                style={{ backgroundColor: '#0f1f16', borderColor: '#2d5a40' }}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              {defender?.name}'s deadwood
            </label>
            <input
              type="number"
              value={defenderDw}
              onChange={e => setDefenderDw(e.target.value)}
              min={0}
              required
              placeholder="0+"
              className="w-full rounded-lg px-3 py-2 text-white text-center text-lg font-bold focus:outline-none border"
              style={{ backgroundColor: '#0f1f16', borderColor: '#2d5a40' }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving…' : 'Record hand'}
          </Button>
          {lastHandId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleUndo}
              disabled={undoing}
              size="md"
            >
              {undoing ? '…' : '↩ Undo'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
