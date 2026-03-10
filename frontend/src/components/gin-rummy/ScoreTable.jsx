const HAND_LABELS = {
  knock:    { label: 'Knock',    symbol: '✊' },
  undercut: { label: 'Undercut', symbol: '⬇' },
  gin:      { label: 'Gin',      symbol: '♠' },
  big_gin:  { label: 'Big Gin',  symbol: '★' },
}

export function ScoreTable({ game, hands }) {
  const p1 = { id: game.player1_id, name: game.player1_username }
  const p2 = { id: game.player2_id, name: game.player2_username }

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: '#162a1e', borderColor: '#2d5a40' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: '#7ab893', borderBottom: '1px solid #2d5a40', backgroundColor: '#0f1f16' }}>
              <th className="text-left px-3 py-2 font-medium w-8">#</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Winner</th>
              <th className="text-right px-3 py-2 font-medium">Pts</th>
              <th className="text-right px-3 py-2 font-medium">{p1.name}</th>
              <th className="text-right px-3 py-2 font-medium">{p2.name}</th>
            </tr>
          </thead>
          <tbody>
            {hands.map((hand) => {
              const info = HAND_LABELS[hand.hand_type] || { label: hand.hand_type, symbol: '?' }
              const isP1Winner = hand.winner_id === p1.id
              return (
                <tr key={hand.id} className="border-t" style={{ borderColor: '#2d5a40' }}>
                  <td className="px-3 py-2 text-gray-500">{hand.hand_number}</td>
                  <td className="px-3 py-2 text-white">
                    <span className="mr-1">{info.symbol}</span>
                    <span className="hidden sm:inline">{info.label}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-300 hidden sm:table-cell">
                    {hand.winner_username}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={isP1Winner ? 'text-emerald-400' : 'text-orange-300'}>
                      +{hand.points_scored}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${isP1Winner ? 'text-white' : 'text-gray-400'}`}>
                    {hand.player1_running_total}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${!isP1Winner ? 'text-white' : 'text-gray-400'}`}>
                    {hand.player2_running_total}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {hands.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #2d5a40', backgroundColor: '#0f1f16' }}>
                <td colSpan={4} className="px-3 py-2 text-xs uppercase tracking-wide" style={{ color: '#7ab893' }}>
                  Running Total
                </td>
                <td className="px-3 py-2 text-right font-bold text-white">
                  {hands[hands.length - 1].player1_running_total}
                </td>
                <td className="px-3 py-2 text-right font-bold text-white">
                  {hands[hands.length - 1].player2_running_total}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
