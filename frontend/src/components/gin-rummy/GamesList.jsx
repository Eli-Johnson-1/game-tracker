import { Link } from 'react-router-dom'

const STATUS_BADGE = {
  active:   { label: 'Active', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
  complete: { label: 'Complete', cls: 'bg-gray-700/50 text-gray-400 border-gray-600' },
}

export function GamesList({ games }) {
  if (games.length === 0) {
    return (
      <p className="text-center py-8 text-sm" style={{ color: '#7ab893' }}>
        No games yet — start one above!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {games.map(game => {
        const badge = STATUS_BADGE[game.status] || STATUS_BADGE.active
        const date = game.imported
          ? 'Historical'
          : new Date(game.started_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            })

        return (
          <Link
            key={game.id}
            to={`/gin-rummy/games/${game.id}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors hover:border-emerald-600/60"
            style={{ backgroundColor: '#162a1e', borderColor: '#2d5a40' }}
          >
            <div>
              <div className="text-white font-medium text-sm">
                {game.player1_username} <span style={{ color: '#7ab893' }}>vs</span> {game.player2_username}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#7ab893' }}>
                {date} · {game.hand_count} {game.hand_count === 1 ? 'hand' : 'hands'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {game.status === 'complete' && game.winner_username && (
                <span className="text-xs text-white hidden sm:block">
                  🏆 {game.winner_username}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
