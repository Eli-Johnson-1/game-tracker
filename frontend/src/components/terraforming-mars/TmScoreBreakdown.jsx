const COLOR_BG = {
  red:     '#dc2626',
  green:   '#16a34a',
  blue:    '#2563eb',
  yellow:  '#ca8a04',
  black:   '#374151',
  unknown: '#6b7280',
}

const RANK_LABELS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }

function ColorChip({ color }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
      style={{ backgroundColor: COLOR_BG[color] || '#6b7280' }}
    />
  )
}

export function TmScoreBreakdown({ game }) {
  if (!game || game.status !== 'complete') return null

  const sorted = [...game.players].sort((a, b) => (a.final_rank ?? 99) - (b.final_rank ?? 99))
  const isSolo = game.mode === 'solo'
  const winner = sorted[0]
  const showMegaCredits = !isSolo && sorted.some(p => (p.mega_credits ?? 0) > 0)

  return (
    <div className="space-y-4 mb-6">
      {/* Solo result banner */}
      {isSolo && (
        <div
          className="rounded-lg px-4 py-3 text-center font-semibold text-sm"
          style={{
            backgroundColor: game.solo_terraformed ? '#14532d' : '#450a0a',
            color: game.solo_terraformed ? '#86efac' : '#fca5a5',
          }}
        >
          {game.solo_terraformed
            ? `✓ Terraformed! — Generation ${game.generation}`
            : `✗ DNF — Generation ${game.generation}`}
        </div>
      )}

      {/* Multiplayer winner banner */}
      {!isSolo && winner && (
        <div
          className="rounded-lg px-4 py-3 text-center text-sm font-semibold"
          style={{ backgroundColor: '#422006', color: '#fdba74' }}
        >
          🏆 {winner.player_name} wins with {winner.total_vps} VP
          {!game.imported && game.generation ? ` — Generation ${game.generation}` : null}
          {!!game.venus_next && game.venus_scale != null && ` · Venus ${game.venus_scale}%`}
        </div>
      )}

      {/* Score table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#7c2d12' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#2d1000', color: '#f97316' }}>
                <th className="text-left px-3 py-2 font-medium">Player</th>
                <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="Terraforming Rating">TR</th>
                <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="Greenery tiles (1 VP each)">Grn</th>
                <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="City-adjacent greeneries (1 VP each)">City</th>
                <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="Card VPs">Cards</th>
                {!isSolo && (
                  <>
                    <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="Milestone VPs">Mile</th>
                    <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="Award VPs">Awrd</th>
                  </>
                )}
                <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Total</th>
                {showMegaCredits && (
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap" title="Mega Credits tiebreaker">M€</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const isWinner = p.final_rank === 1
                const rankLabel = RANK_LABELS[p.final_rank] || `${p.final_rank}th`
                return (
                  <tr
                    key={p.id}
                    className={i % 2 === 0 ? 'bg-black/10' : ''}
                    style={isWinner ? { backgroundColor: '#422006' } : {}}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ColorChip color={p.color} />
                        <span className={`${isWinner ? 'text-orange-300 font-semibold' : 'text-white'}`}>
                          {p.player_name}
                        </span>
                        <span className="text-xs text-gray-500">{rankLabel}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-gray-300">{p.tr}</td>
                    <td className="px-2 py-2 text-right text-gray-300">{p.greeneries}</td>
                    <td className="px-2 py-2 text-right text-gray-300">{p.city_adjacent_greeneries}</td>
                    <td className="px-2 py-2 text-right text-gray-300">{p.card_vps}</td>
                    {!isSolo && (
                      <>
                        <td className="px-2 py-2 text-right text-gray-300">{p.milestone_vps}</td>
                        <td className="px-2 py-2 text-right text-gray-300">{p.award_vps}</td>
                      </>
                    )}
                    <td className={`px-3 py-2 text-right font-bold ${isWinner ? 'text-orange-300' : 'text-white'}`}>
                      {p.total_vps}
                    </td>
                    {showMegaCredits && (
                      <td className="px-2 py-2 text-right text-gray-300">{p.mega_credits ?? 0}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestones */}
      {!isSolo && game.milestones?.length > 0 && (
        <div className="text-sm text-gray-400 space-y-1">
          <span className="font-medium text-gray-300">Milestones:</span>
          {game.milestones.map(m => (
            <div key={m.id} className="ml-2">
              <span className="text-gray-300">{m.milestone_name}:</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <ColorChip color={m.color} /> {m.player_name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      {!isSolo && game.awards?.length > 0 && (
        <div className="text-sm text-gray-400 space-y-1">
          <span className="font-medium text-gray-300">Awards:</span>
          {game.awards.map(a => {
            const firstPlace = a.places.filter(ap => ap.place === 1)
            const secondPlace = a.places.filter(ap => ap.place === 2)
            return (
              <div key={a.id} className="ml-2">
                <span className="text-gray-300">{a.award_name}:</span>
                {firstPlace.length > 0 && (
                  <div className="ml-2 flex items-center gap-1 flex-wrap">
                    <span className="text-gray-500 text-xs">1st —</span>
                    {firstPlace.map(ap => (
                      <span key={ap.id} className="inline-flex items-center gap-1">
                        <ColorChip color={ap.color} /> {ap.player_name}
                      </span>
                    ))}
                  </div>
                )}
                {secondPlace.length > 0 && (
                  <div className="ml-2 flex items-center gap-1 flex-wrap">
                    <span className="text-gray-500 text-xs">2nd —</span>
                    {secondPlace.map(ap => (
                      <span key={ap.id} className="inline-flex items-center gap-1">
                        <ColorChip color={ap.color} /> {ap.player_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
