/**
 * Pure scoring functions for Gin Rummy.
 * No database access — all inputs passed as arguments so logic is fully testable.
 */

/**
 * Calculate the result of a single hand.
 *
 * @param {'knock'|'gin'|'big_gin'} handType   - Type declared by the player acting
 * @param {number|null} knockerDeadwood          - Deadwood of the acting player (null for gin/big_gin)
 * @param {number|null} defenderDeadwood         - Deadwood of the other player (null for gin/big_gin)
 * @param {object} settings                      - Scoring settings map
 * @returns {{ handType: string, winner: 'knocker'|'defender', pointsScored: number }}
 */
function calculateHandResult(handType, knockerDeadwood, defenderDeadwood, settings) {
  if (handType === 'gin') {
    return {
      handType: 'gin',
      winner: 'knocker',
      pointsScored: (defenderDeadwood ?? 0) + settings.gin_bonus,
    }
  }

  if (handType === 'big_gin') {
    return {
      handType: 'big_gin',
      winner: 'knocker',
      pointsScored: (defenderDeadwood ?? 0) + settings.big_gin_bonus,
    }
  }

  if (handType === 'knock') {
    const diff = defenderDeadwood - knockerDeadwood

    if (diff <= 0) {
      // Undercut: defender wins (includes equal deadwood case)
      return {
        handType: 'undercut',
        winner: 'defender',
        pointsScored: (knockerDeadwood - defenderDeadwood) + settings.undercut_bonus,
      }
    }

    return {
      handType: 'knock',
      winner: 'knocker',
      pointsScored: diff,
    }
  }

  throw new Error(`Unknown hand type: ${handType}`)
}

/**
 * Check whether the running totals have crossed the end-game threshold.
 *
 * @param {number} p1Total
 * @param {number} p2Total
 * @param {object} settings
 * @returns {boolean}
 */
function checkEndGame(p1Total, p2Total, settings) {
  return p1Total >= settings.gin_rummy_win_threshold || p2Total >= settings.gin_rummy_win_threshold
}

/**
 * Calculate final scores once end-game is triggered.
 *
 * @param {object} game    - { player1_id, player2_id }
 * @param {Array}  hands   - Array of hand rows (each has winner_id, player1_running_total, player2_running_total)
 * @param {object} settings
 * @returns {{ winner_id, is_shutout, player1_final_score, player2_final_score, breakdown }}
 */
function calculateEndGameScoring(game, hands, settings) {
  const { player1_id, player2_id } = game

  const p1HandsWon = hands.filter(h => h.winner_id === player1_id).length
  const p2HandsWon = hands.filter(h => h.winner_id === player2_id).length

  const lastHand = hands[hands.length - 1]
  const p1Running = lastHand.player1_running_total
  const p2Running = lastHand.player2_running_total

  const winner_id = p1Running >= p2Running ? player1_id : player2_id
  const loser_id  = winner_id === player1_id ? player2_id : player1_id
  const loserHandsWon = winner_id === player1_id ? p2HandsWon : p1HandsWon

  const p1LineBonus = p1HandsWon * settings.line_bonus
  const p2LineBonus = p2HandsWon * settings.line_bonus

  let winnerGameBonus = settings.game_bonus
  const is_shutout = settings.shutout_enabled && loserHandsWon === 0

  if (is_shutout) {
    winnerGameBonus += settings.shutout_extra_game_bonus
  }

  let player1_final_score = p1Running + p1LineBonus
  let player2_final_score = p2Running + p2LineBonus

  if (winner_id === player1_id) {
    player1_final_score += winnerGameBonus
  } else {
    player2_final_score += winnerGameBonus
  }

  return {
    winner_id,
    is_shutout,
    player1_final_score,
    player2_final_score,
    breakdown: {
      player1_running: p1Running,
      player2_running: p2Running,
      player1_line_bonus: p1LineBonus,
      player2_line_bonus: p2LineBonus,
      winner_game_bonus: winnerGameBonus,
      is_shutout,
    },
  }
}

module.exports = { calculateHandResult, checkEndGame, calculateEndGameScoring }
