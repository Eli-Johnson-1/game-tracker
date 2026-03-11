import { useState, useRef } from 'react'
import { CardVpInput } from './CardVpInput'
import { analyzePhoto, completeGame, updateGame } from '../../api/terraformingMars'

const MILESTONE_NAMES = ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner']
const AWARD_NAMES = ['Landlord', 'Banker', 'Scientist', 'Thermalist', 'Miner']

const COLOR_BG = {
  red:    '#dc2626',
  green:  '#16a34a',
  blue:   '#2563eb',
  yellow: '#ca8a04',
  black:  '#374151',
}

function ColorChip({ color }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-white/30 flex-shrink-0"
      style={{ backgroundColor: COLOR_BG[color] || '#6b7280' }}
    />
  )
}

function NumInput({ value, onChange, min = 0, max, label }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Math.max(min, max !== undefined ? Math.min(max, Number(e.target.value)) : Number(e.target.value)))}
      min={min}
      max={max}
      aria-label={label}
      className="w-20 rounded px-2 py-1 text-sm bg-gray-700 border border-gray-600 text-white text-right focus:outline-none focus:ring-1 focus:ring-orange-500"
    />
  )
}

function buildPlayerState(players, initialData) {
  return Object.fromEntries(players.map(p => {
    const saved = initialData?.players?.find(ip => ip.id === p.id)
    return [p.id, {
      tr: saved?.tr ?? 20,
      greeneries: saved?.greeneries ?? 0,
      city_adjacent_greeneries: saved?.city_adjacent_greeneries ?? 0,
      card_vps_expression: saved?.card_vps_expression ?? '',
      card_vps_value: saved?.card_vps ?? 0,
      fromPhoto: {},
    }]
  }))
}

function buildMilestoneState(initialData) {
  if (!initialData?.milestones?.length) return {}
  return Object.fromEntries(
    initialData.milestones.map(m => [m.milestone_name, m.claimed_by_player_id])
  )
}

function buildAwardState(initialData) {
  if (!initialData?.awards?.length) return {}
  const result = {}
  for (const a of initialData.awards) {
    const firstPlace = (a.places || []).filter(ap => ap.place === 1).map(ap => ap.player_id)
    const secondPlace = (a.places || []).filter(ap => ap.place === 2).map(ap => ap.player_id)
    result[a.award_name] = { firstPlace, secondPlace }
  }
  return result
}

export function TmScoringForm({ game, onCompleted, initialData, isEditing }) {
  const [tab, setTab] = useState('manual')
  const [generation, setGeneration] = useState(initialData?.generation ?? 14)
  const [soloTerraformed, setSoloTerraformed] = useState(initialData?.solo_terraformed === 1)
  const [playerData, setPlayerData] = useState(() => buildPlayerState(game.players, initialData))
  const [milestones, setMilestones] = useState(() => buildMilestoneState(initialData))
  const [awards, setAwards] = useState(() => buildAwardState(initialData))

  // Photo state
  const [photoFile, setPhotoFile] = useState(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoNotes, setPhotoNotes] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function handleFilePick(file) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('File is too large (max 10 MB)')
      return
    }
    setPhotoFile(file)
    setPhotoError('')
  }

  function clearPhotoFile() {
    setPhotoFile(null)
    setPhotoError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function updatePlayer(playerId, changes) {
    setPlayerData(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], ...changes },
    }))
  }

  function toggleMilestone(name, checked) {
    setMilestones(prev => {
      if (!checked) {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return { ...prev, [name]: game.players[0].id }
    })
  }

  function canClaimMilestone(name) {
    const claimed = Object.keys(milestones).filter(n => n !== name).length
    return claimed < 3 || milestones[name] !== undefined
  }

  function toggleAward(name, checked) {
    setAwards(prev => {
      if (!checked) {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return { ...prev, [name]: { firstPlace: [], secondPlace: [] } }
    })
  }

  function canFundAward(name) {
    const funded = Object.keys(awards).filter(n => n !== name).length
    return funded < 3 || awards[name] !== undefined
  }

  function toggleAwardPlace(awardName, playerId, place) {
    setAwards(prev => {
      const current = prev[awardName] || { firstPlace: [], secondPlace: [] }
      const key = place === 1 ? 'firstPlace' : 'secondPlace'
      const list = current[key]
      const next = list.includes(playerId)
        ? list.filter(id => id !== playerId)
        : [...list, playerId]
      return { ...prev, [awardName]: { ...current, [key]: next } }
    })
  }

  async function handleAnalyzePhoto() {
    if (!photoFile) return
    setPhotoAnalyzing(true)
    setPhotoError('')
    setPhotoNotes('')
    try {
      const formData = new FormData()
      formData.append('image', photoFile)
      const { data } = await analyzePhoto(formData)

      if (data.generation) setGeneration(data.generation)

      for (const pp of data.players || []) {
        const gamePlayer = game.players.find(p => p.color === pp.color)
        if (!gamePlayer) continue
        updatePlayer(gamePlayer.id, {
          tr: pp.tr ?? 20,
          greeneries: pp.greeneries ?? 0,
          city_adjacent_greeneries: pp.city_adjacent_greeneries ?? 0,
          fromPhoto: { tr: true, greeneries: true, city_adjacent_greeneries: true },
        })
      }

      if (data.notes) setPhotoNotes(data.notes)
      setTab('manual')
    } catch (err) {
      const status = err.response?.status
      if (status === 503) {
        setPhotoError(
          (err.response?.data?.hint || err.response?.data?.error || 'Photo analysis not configured.') +
          ' Add ANTHROPIC_API_KEY to the backend .env file and restart.'
        )
      } else {
        setPhotoError(err.response?.data?.error || 'Photo analysis failed')
      }
    } finally {
      setPhotoAnalyzing(false)
    }
  }

  async function handleSubmit() {
    setSubmitError('')
    setSubmitting(true)
    try {
      const payload = {
        generation,
        solo_terraformed: game.mode === 'solo' ? soloTerraformed : undefined,
        players: game.players.map(p => {
          const d = playerData[p.id]
          return {
            player_id: p.id,
            tr: d.tr,
            greeneries: d.greeneries,
            city_adjacent_greeneries: d.city_adjacent_greeneries,
            card_vps_expression: d.card_vps_expression || '',
          }
        }),
        milestones: Object.entries(milestones).map(([name, player_id]) => ({
          milestone_name: name,
          player_id,
        })),
        awards: Object.entries(awards).map(([name, { firstPlace, secondPlace }]) => ({
          award_name: name,
          places: [
            ...firstPlace.map(id => ({ player_id: id, place: 1 })),
            ...secondPlace.map(id => ({ player_id: id, place: 2 })),
          ],
        })),
      }

      const { data } = isEditing
        ? await updateGame(game.id, payload)
        : await completeGame(game.id, payload)
      onCompleted(data.game)
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to save scores')
    } finally {
      setSubmitting(false)
    }
  }

  const isSolo = game.mode === 'solo'

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: '#7c2d12' }}>
        {['manual', 'photo'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium capitalize transition-colors"
            style={{
              color: tab === t ? '#ea580c' : '#9ca3af',
              borderBottom: tab === t ? '2px solid #ea580c' : '2px solid transparent',
            }}
          >
            {t === 'photo' ? '📷 Photo' : '✏️ Manual'}
          </button>
        ))}
      </div>

      {/* Photo tab */}
      {tab === 'photo' && (
        <div className="space-y-4">
          {photoError && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: '#450a0a', color: '#fca5a5' }}>
              {photoError}
            </div>
          )}
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: dragging ? '#ea580c' : photoFile ? '#c2410c' : '#7c2d12',
              backgroundColor: dragging ? '#2d1500' : 'transparent',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setDragging(false)
              handleFilePick(e.dataTransfer.files?.[0])
            }}
          >
            <div className="text-4xl mb-2">📷</div>
            {photoFile ? (
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-orange-300 truncate max-w-xs">{photoFile.name}</p>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearPhotoFile() }}
                  className="text-gray-400 hover:text-white transition-colors text-lg leading-none flex-shrink-0"
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-300">
                {dragging ? 'Drop it!' : 'Drop a photo here, or click to browse'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, etc. — max 10 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFilePick(e.target.files?.[0])}
            />
          </div>
          <button
            onClick={handleAnalyzePhoto}
            disabled={!photoFile || photoAnalyzing}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#ea580c' }}
          >
            {photoAnalyzing ? 'Analyzing…' : 'Analyze Board'}
          </button>
          {photoNotes && (
            <div className="rounded p-3 text-xs" style={{ backgroundColor: '#1a1000', color: '#fbbf24' }}>
              <strong>Analysis notes:</strong> {photoNotes}
            </div>
          )}
        </div>
      )}

      {/* Manual tab */}
      {tab === 'manual' && (
        <div className="space-y-6">
          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Generation</label>
              <NumInput value={generation} onChange={setGeneration} min={1} max={30} label="Generation" />
            </div>
            {isSolo && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Terraforming completed?</label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-1 text-sm text-white cursor-pointer">
                    <input
                      type="radio"
                      checked={soloTerraformed}
                      onChange={() => setSoloTerraformed(true)}
                      className="accent-orange-500"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1 text-sm text-white cursor-pointer">
                    <input
                      type="radio"
                      checked={!soloTerraformed}
                      onChange={() => setSoloTerraformed(false)}
                      className="accent-orange-500"
                    />
                    No (DNF)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Per-player rows */}
          <div className="space-y-4">
            {game.players.map(p => {
              const d = playerData[p.id]
              return (
                <div key={p.id} className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ColorChip color={p.color} />
                    <span className="font-semibold text-white">{p.player_name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        TR
                        {d.fromPhoto?.tr && <span className="ml-1 text-yellow-400 text-xs">From photo</span>}
                      </label>
                      <NumInput
                        value={d.tr}
                        onChange={v => updatePlayer(p.id, { tr: v, fromPhoto: { ...d.fromPhoto, tr: false } })}
                        min={0} max={100}
                        label={`TR for ${p.player_name}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Greeneries
                        {d.fromPhoto?.greeneries && <span className="ml-1 text-yellow-400 text-xs">From photo</span>}
                      </label>
                      <NumInput
                        value={d.greeneries}
                        onChange={v => updatePlayer(p.id, { greeneries: v, fromPhoto: { ...d.fromPhoto, greeneries: false } })}
                        label={`Greeneries for ${p.player_name}`}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                        City-adjacent greeneries
                        {/* CSS hover tooltip — more reliable than title attribute */}
                        <span className="relative cursor-help group inline-flex items-center">
                          <span className="text-gray-500">ⓘ</span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 rounded px-2 py-1 text-xs text-white bg-gray-900 border border-gray-700 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center normal-case font-normal tracking-normal">
                            Count every greenery tile touching each of your cities, regardless of who placed it
                          </span>
                        </span>
                        {d.fromPhoto?.city_adjacent_greeneries && <span className="ml-1 text-yellow-400 text-xs">From photo</span>}
                      </label>
                      <NumInput
                        value={d.city_adjacent_greeneries}
                        onChange={v => updatePlayer(p.id, { city_adjacent_greeneries: v, fromPhoto: { ...d.fromPhoto, city_adjacent_greeneries: false } })}
                        label={`City-adjacent greeneries for ${p.player_name}`}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Card VPs</label>
                      <CardVpInput
                        value={{ expression: d.card_vps_expression, value: d.card_vps_value }}
                        onChange={({ expression, value }) => updatePlayer(p.id, { card_vps_expression: expression, card_vps_value: value })}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Milestones (multiplayer only) */}
          {!isSolo && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Milestones</h3>
              <div className="space-y-3">
                {MILESTONE_NAMES.map(name => {
                  const isClaimed = milestones[name] !== undefined
                  const canClaim = canClaimMilestone(name)
                  return (
                    <div key={name}>
                      <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isClaimed}
                          onChange={e => canClaim && toggleMilestone(name, e.target.checked)}
                          disabled={!isClaimed && !canClaim}
                          className="accent-orange-500"
                        />
                        {name}
                        {!isClaimed && !canClaim && (
                          <span className="text-xs text-gray-500">(max 3)</span>
                        )}
                      </label>
                      {isClaimed && (
                        <div className="ml-6 mt-2 flex flex-wrap gap-3">
                          {game.players.map(p => (
                            <label key={p.id} className="flex items-center gap-1 text-sm text-white cursor-pointer">
                              <input
                                type="radio"
                                name={`milestone-${name}`}
                                checked={milestones[name] === p.id}
                                onChange={() => setMilestones(prev => ({ ...prev, [name]: p.id }))}
                                className="accent-orange-500"
                              />
                              <ColorChip color={p.color} />
                              {p.player_name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Awards (multiplayer only) */}
          {!isSolo && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Awards</h3>
              <div className="space-y-4">
                {AWARD_NAMES.map(name => {
                  const isFunded = awards[name] !== undefined
                  const canFund = canFundAward(name)
                  const awardData = awards[name]
                  const firstTied = (awardData?.firstPlace?.length ?? 0) >= 2
                  return (
                    <div key={name}>
                      <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFunded}
                          onChange={e => canFund && toggleAward(name, e.target.checked)}
                          disabled={!isFunded && !canFund}
                          className="accent-orange-500"
                        />
                        {name}
                        {!isFunded && !canFund && (
                          <span className="text-xs text-gray-500">(max 3)</span>
                        )}
                      </label>
                      {isFunded && awardData && (
                        <div className="ml-6 mt-2 space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">1st place (5 VP) — select all tied</p>
                            <div className="flex flex-wrap gap-3">
                              {game.players.map(p => (
                                <label key={p.id} className="flex items-center gap-1 text-sm text-white cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={awardData.firstPlace.includes(p.id)}
                                    onChange={() => toggleAwardPlace(name, p.id, 1)}
                                    className="accent-orange-500"
                                  />
                                  <ColorChip color={p.color} />
                                  {p.player_name}
                                </label>
                              ))}
                            </div>
                          </div>
                          {!firstTied && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">2nd place (2 VP) — select all tied</p>
                              <div className="flex flex-wrap gap-3">
                                {game.players
                                  .filter(p => !awardData.firstPlace.includes(p.id))
                                  .map(p => (
                                    <label key={p.id} className="flex items-center gap-1 text-sm text-white cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={awardData.secondPlace.includes(p.id)}
                                        onChange={() => toggleAwardPlace(name, p.id, 2)}
                                        className="accent-orange-500"
                                      />
                                      <ColorChip color={p.color} />
                                      {p.player_name}
                                    </label>
                                  ))}
                              </div>
                            </div>
                          )}
                          {firstTied && (
                            <p className="text-xs text-gray-500 italic">Tie for 1st — no 2nd place awarded</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          {submitError && (
            <div className="rounded p-3 text-sm text-red-400" style={{ backgroundColor: '#450a0a' }}>
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#ea580c' }}
          >
            {submitting ? 'Saving scores…' : isEditing ? 'Update Scores' : 'Finalize Scores'}
          </button>
        </div>
      )}
    </div>
  )
}
