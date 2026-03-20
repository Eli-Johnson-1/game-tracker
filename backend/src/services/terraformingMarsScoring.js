/**
 * Pure scoring functions for Terraforming Mars.
 * No database access — all inputs passed as arguments so logic is fully testable.
 */

const { evaluate } = require('mathjs')

/**
 * Safely evaluate a card VP arithmetic expression.
 * Only allows digits, spaces, and basic arithmetic operators.
 * Result is rounded to the nearest integer.
 *
 * @param {string} expr  - e.g. "13+2+5-2"
 * @returns {number}     - integer result
 * @throws {Error}       - on invalid expression, non-numeric chars, or non-finite result
 */
function evaluateSafeExpression(expr) {
  if (typeof expr !== 'string' || expr.trim() === '') {
    throw new Error('Expression must be a non-empty string')
  }

  if (!/^[\d\s+\-*/().]+$/.test(expr)) {
    throw new Error('Expression contains invalid characters — only digits and + - * / ( ) are allowed')
  }

  let result
  try {
    result = evaluate(expr)
  } catch {
    throw new Error(`Invalid expression: ${expr}`)
  }

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error(`Expression did not evaluate to a finite number: ${expr}`)
  }

  return Math.round(result)
}

/**
 * Calculate total award VPs for a single player across all funded awards.
 *
 * @param {number} playerId
 * @param {Array<{award_id: number, player_id: number, place: number}>} awardPlaces
 * @returns {number}
 */
function calculateAwardVps(playerId, awardPlaces) {
  return awardPlaces.reduce((total, ap) => {
    if (ap.player_id !== playerId) return total
    if (ap.place === 1) return total + 5
    if (ap.place === 2) return total + 2
    return total
  }, 0)
}

/**
 * Calculate all VP components for a single player.
 *
 * @param {{ tr: number, greeneries: number, city_adjacent_greeneries: number, card_vps: number }} player
 * @param {number} milestoneVps  - already computed (5 per milestone claimed)
 * @param {number} awardVps      - already computed via calculateAwardVps
 * @returns {{ tr, greeneryVps, cityVps, milestoneVps, awardVps, cardVps, total }}
 */
function calculatePlayerVps(player, milestoneVps, awardVps) {
  const tr = player.tr
  const greeneryVps = player.greeneries        // 1 VP per greenery tile placed
  const cityVps = player.city_adjacent_greeneries  // 1 VP per adj greenery (any owner)
  const cardVps = player.card_vps

  const total = tr + greeneryVps + cityVps + milestoneVps + awardVps + cardVps

  return { tr, greeneryVps, cityVps, milestoneVps, awardVps, cardVps, total }
}

/**
 * Rank players by total VP using competition ranking.
 * Ties share the same rank; the next rank skips accordingly.
 * e.g. two players tied for 1st → both rank 1, next player → rank 3.
 *
 * @param {Array<{ id: number, total_vps: number }>} scoredPlayers
 * @returns {Array<{ id: number, total_vps: number, final_rank: number }>}
 */
function rankPlayers(scoredPlayers) {
  const sorted = [...scoredPlayers].sort((a, b) =>
    b.total_vps - a.total_vps || (b.mega_credits || 0) - (a.mega_credits || 0)
  )

  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const sameRank = cur.total_vps === prev.total_vps &&
        (cur.mega_credits || 0) === (prev.mega_credits || 0)
      if (!sameRank) rank = i + 1
    }
    sorted[i].final_rank = rank
  }

  return sorted
}

module.exports = { evaluateSafeExpression, calculateAwardVps, calculatePlayerVps, rankPlayers }
