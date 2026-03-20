import { useState, useEffect, useRef } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { ErrorMessage } from '../common/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { listUsers } from '../../api/users'
import { createGame } from '../../api/terraformingMars'

const COLORS = ['red', 'green', 'blue', 'yellow', 'black', 'unknown']

const COLOR_STYLES = {
  red:     { bg: '#dc2626', label: 'Red' },
  green:   { bg: '#16a34a', label: 'Green' },
  blue:    { bg: '#2563eb', label: 'Blue' },
  yellow:  { bg: '#ca8a04', label: 'Yellow' },
  black:   { bg: '#374151', label: 'Black' },
  unknown: { bg: '#6b7280', label: 'Unknown' },
}

function makePlayer(userId, username, color) {
  return { user_id: userId, player_name: username, color, isRegistered: !!userId }
}

export function NewTmGameModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)         // 1 = pick mode, 2 = configure players
  const [mode, setMode] = useState(null)
  const [venusNext, setVenusNext] = useState(false)
  const [playedDate, setPlayedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [historical, setHistorical] = useState(false)
  const [players, setPlayers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [error])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setMode(null)
    setVenusNext(false)
    setPlayedDate(new Date().toISOString().slice(0, 10))
    setHistorical(false)
    setPlayers([])
    setError('')
    listUsers().then(({ data }) => setAllUsers(data.users)).catch(() => {})
  }, [open])

  function firstAvailableUser(excludeIds) {
    return allUsers.find(u => !excludeIds.includes(u.id)) || null
  }

  function selectMode(m) {
    setMode(m)
  }

  function handleNext() {
    if (!mode) return
    const defaultColor = historical ? 'unknown' : 'red'
    if (mode === 'solo') {
      setPlayers([makePlayer(user.id, user.username, defaultColor)])
    } else {
      const p2Color = historical ? 'unknown' : 'green'
      const availableUser = firstAvailableUser([user.id])
      const p2 = availableUser
        ? makePlayer(availableUser.id, availableUser.username, p2Color)
        : makePlayer(null, '', p2Color)
      setPlayers([makePlayer(user.id, user.username, defaultColor), p2])
    }
    setStep(2)
  }

  function usedColors() {
    return players.map(p => p.color)
  }

  function updatePlayer(i, changes) {
    setPlayers(prev => prev.map((p, idx) => idx === i ? { ...p, ...changes } : p))
  }

  function addPlayer() {
    if (players.length >= 5) return
    const color = historical
      ? 'unknown'
      : (COLORS.filter(c => c !== 'unknown').find(c => !usedColors().includes(c)) || 'red')
    const usedIds = players.filter(p => p.user_id).map(p => p.user_id)
    const availableUser = firstAvailableUser(usedIds)
    const newPlayer = availableUser
      ? makePlayer(availableUser.id, availableUser.username, color)
      : makePlayer(null, '', color)
    setPlayers(prev => [...prev, newPlayer])
  }

  function removePlayer(i) {
    setPlayers(prev => prev.filter((_, idx) => idx !== i))
  }

  function setColor(i, color) {
    setPlayers(prev => {
      const oldColor = prev[i].color
      // 'unknown' can be shared — just set it directly without swapping
      if (color === 'unknown') {
        return prev.map((p, idx) => idx === i ? { ...p, color } : p)
      }
      const conflictIdx = prev.findIndex((p, idx) => idx !== i && p.color === color)
      if (conflictIdx === -1) {
        // Color is free — just set it
        return prev.map((p, idx) => idx === i ? { ...p, color } : p)
      }
      // Swap: give the conflict player our old color
      return prev.map((p, idx) => {
        if (idx === i) return { ...p, color }
        if (idx === conflictIdx) return { ...p, color: oldColor }
        return p
      })
    })
  }

  function toggleRegistered(i, isRegistered) {
    if (isRegistered) {
      // switching to registered user — pre-fill with first available user
      const otherUserIds = players.filter((_, idx) => idx !== i && players[idx].user_id).map(p => p.user_id)
      const available = allUsers.find(u => !otherUserIds.includes(u.id))
      updatePlayer(i, { isRegistered: true, user_id: available?.id || null, player_name: available?.username || '' })
    } else {
      updatePlayer(i, { isRegistered: false, user_id: null, player_name: '' })
    }
  }

  function selectUser(i, userId) {
    const u = allUsers.find(u => u.id === Number(userId))
    if (u) updatePlayer(i, { user_id: u.id, player_name: u.username })
  }

  async function handleCreate() {
    setError('')
    // Validate
    for (const p of players) {
      if (!p.player_name.trim()) {
        setError('All players must have a name')
        return
      }
    }
    const names = players.map(p => p.player_name.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      setError('All players must have unique names')
      return
    }
    setLoading(true)
    try {
      const payload = {
        mode,
        venus_next: venusNext,
        played_at: historical ? null : playedDate,
        imported: historical,
        players: players.map(p => ({
          user_id: p.user_id || null,
          player_name: p.player_name.trim(),
          color: p.color,
        })),
      }
      const { data } = await createGame(payload)
      onCreated(data.game)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Terraforming Mars Game">
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-300">Choose game mode:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => selectMode('solo')}
              className="p-4 rounded-lg border-2 text-center transition-colors hover:border-orange-500"
              style={{ borderColor: mode === 'solo' ? '#ea580c' : '#7c2d12', backgroundColor: '#1a0800' }}
            >
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-white font-semibold">Solo</div>
              <div className="text-xs text-gray-400 mt-1">Just you vs. the board</div>
            </button>
            <button
              onClick={() => selectMode('multiplayer')}
              className="p-4 rounded-lg border-2 text-center transition-colors hover:border-orange-500"
              style={{ borderColor: mode === 'multiplayer' ? '#ea580c' : '#7c2d12', backgroundColor: '#1a0800' }}
            >
              <div className="text-2xl mb-1">👥</div>
              <div className="text-white font-semibold">Multiplayer</div>
              <div className="text-xs text-gray-400 mt-1">2–5 players</div>
            </button>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Choose expansions:</p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={venusNext}
                onChange={e => setVenusNext(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">Venus Next</span>
            </label>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Date played:</p>
            <input
              type="date"
              value={playedDate}
              onChange={e => setPlayedDate(e.target.value)}
              disabled={historical}
              max={today}
              className="rounded px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <label className="flex items-center gap-2 mt-2 text-sm text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={historical}
                onChange={e => setHistorical(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              Date unknown (mark as historical)
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleNext} disabled={!mode}>Next: Add Players</Button>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div ref={errorRef}>
            <ErrorMessage message={error} />
          </div>

          <div className="space-y-3">
            {players.map((p, i) => {
              return (
                <div key={i} className="rounded-lg p-3 border" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Player {i + 1}</span>
                    {i > 0 && (
                      <button onClick={() => removePlayer(i)} className="text-xs text-red-400 hover:text-red-300">
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Color picker */}
                  <div className="flex gap-2 mb-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(i, c)}
                        title={COLOR_STYLES[c].label}
                        className="w-7 h-7 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: COLOR_STYLES[c].bg,
                          borderColor: p.color === c ? 'white' : 'transparent',
                        }}
                      />
                    ))}
                  </div>

                  {/* Name / user selector */}
                  {i === 0 ? (
                    // Creator row — always the logged-in user
                    <p className="text-sm text-white">{p.player_name}</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            checked={p.isRegistered}
                            onChange={() => toggleRegistered(i, true)}
                            className="accent-orange-500"
                          />
                          Registered user
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            checked={!p.isRegistered}
                            onChange={() => toggleRegistered(i, false)}
                            className="accent-orange-500"
                          />
                          Guest name
                        </label>
                      </div>

                      {p.isRegistered ? (
                        <select
                          value={p.user_id || ''}
                          onChange={e => selectUser(i, e.target.value)}
                          className="w-full rounded px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 focus:outline-none"
                        >
                          <option value="">— select user —</option>
                          {allUsers
                            .filter(u => !players.some((pp, j) => j !== i && pp.user_id === u.id))
                            .map(u => (
                              <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={p.player_name}
                          onChange={e => updatePlayer(i, { player_name: e.target.value })}
                          placeholder="Guest name"
                          maxLength={50}
                          className="w-full rounded px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {mode === 'multiplayer' && players.length < 5 && (
            <button
              onClick={addPlayer}
              className="text-sm transition-colors"
              style={{ color: '#f97316' }}
            >
              + Add player
            </button>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating…' : 'Start game'}
            </Button>
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
