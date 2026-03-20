import { useState, useRef } from 'react'
import { CardVpInput } from './CardVpInput'
import { analyzePhoto, completeGame, updateGame } from '../../api/terraformingMars'

// Feature flag — set to true to re-enable photo analysis
const PHOTO_ANALYSIS_ENABLED = false

const BASE_MILESTONE_NAMES = ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner']
const BASE_AWARD_NAMES = ['Landlord', 'Banker', 'Scientist', 'Thermalist', 'Miner']

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

function SelectInput({ value, onChange, min = 0, max, step = 1 }) {
  const options = []
  for (let i = min; i <= max; i += step) options.push(i)
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-20 rounded px-2 py-1 text-sm bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
    >
      {options.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

function buildPlayerState(players, initialData, mode) {
  const defaultTr = mode === 'solo' ? 14 : 20
  return Object.fromEntries(players.map(p => {
    const saved = initialData?.players?.find(ip => ip.id === p.id)
    return [p.id, {
      tr: saved?.tr ?? defaultTr,
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

function buildHistoricalMilestoneState(initialData) {
  if (!initialData?.milestones?.length) return []
  return initialData.milestones.map(m => ({ player_id: m.claimed_by_player_id }))
}

function buildHistoricalAwardState(initialData) {
  if (!initialData?.awards?.length) return []
  return initialData.awards.map(a => ({
    firstPlace: (a.places || []).filter(ap => ap.place === 1).map(ap => ap.player_id),
    secondPlace: (a.places || []).filter(ap => ap.place === 2).map(ap => ap.player_id),
  }))
}

export function TmScoringForm({ game, onCompleted, initialData, isEditing }) {
  const MILESTONE_NAMES = game.venus_next
    ? [...BASE_MILESTONE_NAMES, 'Hoverlord']
    : BASE_MILESTONE_NAMES
  const AWARD_NAMES = game.venus_next
    ? [...BASE_AWARD_NAMES, 'Venuphile']
    : BASE_AWARD_NAMES

  const [tab, setTab] = useState('manual')
  const [generation, setGeneration] = useState(initialData?.generation ?? 1)
  const [venusScale, setVenusScale] = useState(initialData?.venus_scale ?? 0)
  const [soloTerraformed, setSoloTerraformed] = useState(initialData?.solo_terraformed === 1)
  const [playerData, setPlayerData] = useState(() => buildPlayerState(game.players, initialData, game.mode))
  const [milestones, setMilestones] = useState(() => buildMilestoneState(initialData))
  const [awards, setAwards] = useState(() => buildAwardState(initialData))
  const [historicalMilestones, setHistoricalMilestones] = useState(() => game.imported ? buildHistoricalMilestoneState(initialData) : [])
  const [historicalAwards, setHistoricalAwards] = useState(() => game.imported ? buildHistoricalAwardState(initialData) : [])

  // Photo state
  const [photoFile, setPhotoFile] = useState(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoNotes, setPhotoNotes] = useState('')
  const [fromPhotoGeneration, setFromPhotoGeneration] = useState(false)
  const [fromPhotoMilestones, setFromPhotoMilestones] = useState(false)
  const [fromPhotoAwards, setFromPhotoAwards] = useState(false)
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
    setFromPhotoMilestones(false)
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
    setFromPhotoAwards(false)
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
    setFromPhotoAwards(false)
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

  function addHistoricalMilestone() {
    if (historicalMilestones.length >= 3) return
    setHistoricalMilestones(prev => [...prev, { player_id: game.players[0].id }])
  }

  function removeHistoricalMilestone(i) {
    setHistoricalMilestones(prev => prev.filter((_, idx) => idx !== i))
  }

  function setHistoricalMilestonePlayer(i, playerId) {
    setHistoricalMilestones(prev => prev.map((m, idx) => idx === i ? { ...m, player_id: playerId } : m))
  }

  function addHistoricalAward() {
    if (historicalAwards.length >= 3) return
    setHistoricalAwards(prev => [...prev, { firstPlace: [], secondPlace: [] }])
  }

  function removeHistoricalAward(i) {
    setHistoricalAwards(prev => prev.filter((_, idx) => idx !== i))
  }

  function toggleHistoricalAwardPlace(i, playerId, place) {
    setHistoricalAwards(prev => prev.map((a, idx) => {
      if (idx !== i) return a
      const key = place === 1 ? 'firstPlace' : 'secondPlace'
      const list = a[key]
      const next = list.includes(playerId) ? list.filter(id => id !== playerId) : [...list, playerId]
      return { ...a, [key]: next }
    }))
  }

  async function handleAnalyzePhoto() {
    if (!photoFile) return
    setPhotoAnalyzing(true)
    setPhotoError('')
    setPhotoNotes('')
    try {
      const formData = new FormData()
      formData.append('image', photoFile)
      formData.append('playerColors', JSON.stringify(game.players.map(p => p.color)))
      const { data } = await analyzePhoto(formData)

      if (data.generation != null) {
        setGeneration(data.generation)
        setFromPhotoGeneration(true)
      }

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

      // Pre-fill milestones from photo
      if (data.milestones_claimed?.length) {
        const newMilestones = {}
        for (const m of data.milestones_claimed) {
          const gamePlayer = game.players.find(p => p.color === m.color)
          if (gamePlayer && MILESTONE_NAMES.includes(m.name)) {
            newMilestones[m.name] = gamePlayer.id
          }
        }
        if (Object.keys(newMilestones).length) {
          setMilestones(newMilestones)
          setFromPhotoMilestones(true)
        }
      }

      // Pre-fill awards from photo
      if (data.awards_funded?.length) {
        const newAwards = {}
        for (const a of data.awards_funded) {
          if (!AWARD_NAMES.includes(a.name)) continue
          newAwards[a.name] = { firstPlace: [], secondPlace: [] }
        }
        if (data.landlord_ranks && newAwards['Landlord']) {
          const toIds = colors => (colors || [])
            .map(c => game.players.find(p => p.color === c)?.id)
            .filter(Boolean)
          newAwards['Landlord'] = {
            firstPlace: toIds(data.landlord_ranks.first),
            secondPlace: toIds(data.landlord_ranks.second),
          }
        }
        if (Object.keys(newAwards).length) {
          setAwards(newAwards)
          setFromPhotoAwards(true)
        }
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
        venus_scale: !isSolo && game.venus_next && !game.imported ? venusScale : undefined,
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
        milestones: game.imported
          ? historicalMilestones.map((m, i) => ({ milestone_name: `Milestone ${i + 1}`, player_id: m.player_id }))
          : Object.entries(milestones).map(([name, player_id]) => ({ milestone_name: name, player_id })),
        awards: game.imported
          ? historicalAwards.map((a, i) => ({
              award_name: `Award ${i + 1}`,
              places: [
                ...a.firstPlace.map(id => ({ player_id: id, place: 1 })),
                ...a.secondPlace.map(id => ({ player_id: id, place: 2 })),
              ],
            }))
          : Object.entries(awards).map(([name, { firstPlace, secondPlace }]) => ({
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
          {!PHOTO_ANALYSIS_ENABLED ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#1a0a00', border: '1px solid #7c2d12' }}>
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm font-semibold text-orange-300 mb-1">Photo analysis temporarily unavailable</p>
              <p className="text-xs text-gray-400">Enter scores manually using the Manual tab.</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Manual tab */}
      {tab === 'manual' && (
        <div className="space-y-6">
          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Generation
                {fromPhotoGeneration && <span className="ml-1 text-yellow-400 text-xs">From photo</span>}
              </label>
              <SelectInput value={generation} onChange={v => { setGeneration(v); setFromPhotoGeneration(false) }} min={1} max={25} />
            </div>
            {!isSolo && game.venus_next && !game.imported && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Venus scale (%)</label>
                <SelectInput value={venusScale} onChange={setVenusScale} min={0} max={30} step={2} />
              </div>
            )}
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
                      <SelectInput
                        value={d.tr}
                        onChange={v => updatePlayer(p.id, { tr: v, fromPhoto: { ...d.fromPhoto, tr: false } })}
                        max={100}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Greeneries
                        {d.fromPhoto?.greeneries && <span className="ml-1 text-yellow-400 text-xs">From photo</span>}
                      </label>
                      <SelectInput
                        value={d.greeneries}
                        onChange={v => updatePlayer(p.id, { greeneries: v, fromPhoto: { ...d.fromPhoto, greeneries: false } })}
                        max={40}
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
                      <SelectInput
                        value={d.city_adjacent_greeneries}
                        onChange={v => updatePlayer(p.id, { city_adjacent_greeneries: v, fromPhoto: { ...d.fromPhoto, city_adjacent_greeneries: false } })}
                        max={40}
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
          {!isSolo && !game.imported && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
              <h3 className="text-sm font-semibold text-white mb-3">
                Milestones
                {fromPhotoMilestones && <span className="ml-2 text-yellow-400 text-xs font-normal">From photo</span>}
              </h3>
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
                                onChange={() => { setFromPhotoMilestones(false); setMilestones(prev => ({ ...prev, [name]: p.id })) }}
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

          {/* Historical milestones — player-only, no name required */}
          {!isSolo && !!game.imported && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Milestones</h3>
              <div className="space-y-3">
                {historicalMilestones.map((m, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">Milestone {i + 1}</span>
                      <button onClick={() => removeHistoricalMilestone(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {game.players.map(p => (
                        <label key={p.id} className="flex items-center gap-1 text-sm text-white cursor-pointer">
                          <input
                            type="radio"
                            name={`hist-milestone-${i}`}
                            checked={m.player_id === p.id}
                            onChange={() => setHistoricalMilestonePlayer(i, p.id)}
                            className="accent-orange-500"
                          />
                          <ColorChip color={p.color} />
                          {p.player_name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {historicalMilestones.length < 3 && (
                <button onClick={addHistoricalMilestone} className="text-sm mt-3 transition-colors" style={{ color: '#f97316' }}>
                  + Add milestone
                </button>
              )}
            </div>
          )}

          {/* Awards (multiplayer only) */}
          {!isSolo && !game.imported && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
              <h3 className="text-sm font-semibold text-white mb-3">
                Awards
                {fromPhotoAwards && <span className="ml-2 text-yellow-400 text-xs font-normal">From photo</span>}
              </h3>
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

          {/* Historical awards — player-only, no name required */}
          {!isSolo && !!game.imported && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Awards</h3>
              <div className="space-y-4">
                {historicalAwards.map((a, i) => {
                  const firstTied = a.firstPlace.length >= 2
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">Award {i + 1}</span>
                        <button onClick={() => removeHistoricalAward(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">1st place (5 VP) — select all tied</p>
                          <div className="flex flex-wrap gap-3">
                            {game.players.map(p => (
                              <label key={p.id} className="flex items-center gap-1 text-sm text-white cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={a.firstPlace.includes(p.id)}
                                  onChange={() => toggleHistoricalAwardPlace(i, p.id, 1)}
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
                                .filter(p => !a.firstPlace.includes(p.id))
                                .map(p => (
                                  <label key={p.id} className="flex items-center gap-1 text-sm text-white cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={a.secondPlace.includes(p.id)}
                                      onChange={() => toggleHistoricalAwardPlace(i, p.id, 2)}
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
                    </div>
                  )
                })}
              </div>
              {historicalAwards.length < 3 && (
                <button onClick={addHistoricalAward} className="text-sm mt-3 transition-colors" style={{ color: '#f97316' }}>
                  + Add award
                </button>
              )}
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
