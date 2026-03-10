const { calculateEndGameScoring } = require('./ginRummyScoring')

/**
 * Re-runs end-game scoring for every completed game using the provided settings.
 * Updates player1_final_score, player2_final_score, winner_id, and is_shutout in the DB.
 * Called whenever scoring settings are saved so all historical games stay consistent.
 * Accepts a pre-built settings map to avoid a circular dependency with settingsController.
 */
function recalculateCompletedGames(db, settings) {

  const games = db.prepare(
    "SELECT * FROM gin_rummy_games WHERE status = 'complete'"
  ).all()

  const updateGame = db.prepare(`
    UPDATE gin_rummy_games
    SET player1_final_score = @player1_final_score,
        player2_final_score = @player2_final_score,
        winner_id           = @winner_id,
        is_shutout          = @is_shutout
    WHERE id = @id
  `)

  const recalcAll = db.transaction(() => {
    for (const game of games) {
      const hands = db.prepare(
        'SELECT * FROM gin_rummy_hands WHERE game_id = ? ORDER BY hand_number ASC'
      ).all(game.id)

      if (hands.length === 0) continue

      const result = calculateEndGameScoring(game, hands, settings)

      updateGame.run({
        id: game.id,
        player1_final_score: result.player1_final_score,
        player2_final_score: result.player2_final_score,
        winner_id: result.winner_id,
        is_shutout: result.is_shutout ? 1 : 0,
      })
    }
  })

  recalcAll()
}

module.exports = { recalculateCompletedGames }
