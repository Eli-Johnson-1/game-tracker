export function EndGameSummary({ game, endGame }) {
  if (!game || game.status !== 'complete') return null

  const p1Name = game.player1_username
  const p2Name = game.player2_username
  const isP1Winner = game.winner_id === game.player1_id

  return (
    <div className="rounded-xl border p-5 mb-6"
      style={{ backgroundColor: '#0d1f14', borderColor: '#3a7a50' }}>
      <div className="text-center mb-4">
        <div className="text-3xl mb-1">🏆</div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
          {isP1Winner ? p1Name : p2Name} wins!
        </h2>
        {game.is_shutout ? (
          <p className="text-sm mt-1" style={{ color: '#f9c74f' }}>★ Shutout!</p>
        ) : null}
      </div>

      {/* Final scores */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { name: p1Name, score: game.player1_final_score, isWinner: isP1Winner },
          { name: p2Name, score: game.player2_final_score, isWinner: !isP1Winner },
        ].map(({ name, score, isWinner }) => (
          <div
            key={name}
            className="rounded-lg p-3 text-center border"
            style={{
              backgroundColor: isWinner ? '#1e3d2f' : '#0f1f16',
              borderColor: isWinner ? '#3a7a50' : '#2d5a40',
            }}
          >
            <div className="text-xs mb-1" style={{ color: '#7ab893' }}>{name}</div>
            <div className={`text-2xl font-bold ${isWinner ? 'text-white' : 'text-gray-400'}`}>
              {score}
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      {endGame?.breakdown && (
        <div className="space-y-1 text-xs" style={{ color: '#7ab893' }}>
          <div className="font-semibold uppercase tracking-wide mb-2">Score Breakdown</div>
          <BreakdownRow label={`${p1Name} running total`} value={endGame.breakdown.player1_running} />
          <BreakdownRow label={`${p2Name} running total`} value={endGame.breakdown.player2_running} />
          <BreakdownRow label={`${p1Name} line bonus`} value={`+${endGame.breakdown.player1_line_bonus}`} />
          <BreakdownRow label={`${p2Name} line bonus`} value={`+${endGame.breakdown.player2_line_bonus}`} />
          <BreakdownRow
            label={`Game bonus → ${isP1Winner ? p1Name : p2Name}`}
            value={`+${endGame.breakdown.winner_game_bonus}`}
          />
          {endGame.breakdown.is_shutout && (
            <BreakdownRow label="Shutout bonus included" value="✓" />
          )}
        </div>
      )}
    </div>
  )
}

function BreakdownRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: '#7ab893' }}>{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}
