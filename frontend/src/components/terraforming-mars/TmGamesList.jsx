import { Link } from 'react-router-dom'

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
      className="inline-block w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
      style={{ backgroundColor: COLOR_BG[color] || '#6b7280' }}
    />
  )
}

export function TmGamesList({ games }) {
  if (games.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        No games yet — start one above.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {games.map(g => {
        const winner = g.players?.find(p => p.final_rank === 1)
        const date = g.created_at
          ? new Date(g.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : ''
        const modeLabel = g.mode === 'solo' ? 'Solo' : `${g.player_count ?? g.players?.length ?? '?'}p`

        return (
          <Link
            key={g.id}
            to={`/terraforming-mars/games/${g.id}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors hover:border-orange-600"
            style={{ borderColor: '#7c2d12', backgroundColor: '#2d1000' }}
          >
            <div className="flex items-center gap-3">
              {/* Player color chips */}
              <div className="flex gap-1">
                {(g.players ?? []).map(p => (
                  <ColorChip key={p.id} color={p.color} />
                ))}
              </div>
              <div>
                <div className="text-sm text-white font-medium">
                  {(g.players ?? []).map(p => p.player_name).join(', ')}
                </div>
                <div className="text-xs text-gray-500">
                  {modeLabel} · {date}
                </div>
              </div>
            </div>

            <div className="text-right">
              {g.status === 'complete' ? (
                <div>
                  {winner && (
                    <span className="text-sm font-semibold" style={{ color: '#fdba74' }}>
                      {winner.player_name} · {winner.total_vps} VP
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ backgroundColor: '#422006', color: '#fdba74' }}
                >
                  In Progress
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
