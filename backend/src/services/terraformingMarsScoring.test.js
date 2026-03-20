const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const {
  evaluateSafeExpression,
  calculateAwardVps,
  calculatePlayerVps,
  rankPlayers,
} = require('./terraformingMarsScoring')

// ─── evaluateSafeExpression ───────────────────────────────────────────────────

describe('evaluateSafeExpression', () => {
  test('simple integer', () => {
    assert.equal(evaluateSafeExpression('5'), 5)
  })

  test('addition', () => {
    assert.equal(evaluateSafeExpression('13+2+5'), 20)
  })

  test('mixed operators', () => {
    assert.equal(evaluateSafeExpression('13+2+5-2'), 18)
  })

  test('multiplication', () => {
    assert.equal(evaluateSafeExpression('3*4'), 12)
  })

  test('parentheses', () => {
    assert.equal(evaluateSafeExpression('(3+2)*4'), 20)
  })

  test('decimal result rounds to nearest integer', () => {
    assert.equal(evaluateSafeExpression('7/2'), 4) // 3.5 → rounds to 4
  })

  test('decimal that rounds down', () => {
    assert.equal(evaluateSafeExpression('7/3'), 2) // 2.333... → rounds to 2
  })

  test('whitespace is allowed', () => {
    assert.equal(evaluateSafeExpression('3 + 4'), 7)
  })

  test('negative result', () => {
    assert.equal(evaluateSafeExpression('5-10'), -5)
  })

  test('zero', () => {
    assert.equal(evaluateSafeExpression('0'), 0)
  })

  test('rejects letters', () => {
    assert.throws(() => evaluateSafeExpression('abc'), /invalid characters/)
  })

  test('rejects eval injection', () => {
    assert.throws(() => evaluateSafeExpression("eval('1')"), /invalid characters/)
  })

  test('rejects semicolon SQL injection', () => {
    assert.throws(() => evaluateSafeExpression('; DROP TABLE users'), /invalid characters/)
  })

  test('rejects empty string', () => {
    assert.throws(() => evaluateSafeExpression(''), /non-empty string/)
  })

  test('rejects non-string', () => {
    assert.throws(() => evaluateSafeExpression(null), /non-empty string/)
  })

  test('rejects backtick injection', () => {
    assert.throws(() => evaluateSafeExpression('`ls`'), /invalid characters/)
  })

  test('rejects function-call syntax', () => {
    assert.throws(() => evaluateSafeExpression('Math.sqrt(4)'), /invalid characters/)
  })

  test('division by zero throws', () => {
    assert.throws(() => evaluateSafeExpression('1/0'), /finite/)
  })
})

// ─── calculateAwardVps ────────────────────────────────────────────────────────

describe('calculateAwardVps', () => {
  test('no awards funded → 0 VPs', () => {
    assert.equal(calculateAwardVps(1, []), 0)
  })

  test('1st place → 5 VPs', () => {
    const places = [{ award_id: 1, player_id: 1, place: 1 }]
    assert.equal(calculateAwardVps(1, places), 5)
  })

  test('2nd place → 2 VPs', () => {
    const places = [{ award_id: 1, player_id: 1, place: 2 }]
    assert.equal(calculateAwardVps(1, places), 2)
  })

  test('1st in one award + 2nd in another → 7 VPs', () => {
    const places = [
      { award_id: 1, player_id: 1, place: 1 },
      { award_id: 2, player_id: 1, place: 2 },
    ]
    assert.equal(calculateAwardVps(1, places), 7)
  })

  test('tie for 1st: both get 5 VPs, no 2nd awarded', () => {
    // Both players tied for 1st in award 1 — 2nd place not in award_places at all
    const places = [
      { award_id: 1, player_id: 1, place: 1 },
      { award_id: 1, player_id: 2, place: 1 },
    ]
    assert.equal(calculateAwardVps(1, places), 5)
    assert.equal(calculateAwardVps(2, places), 5)
  })

  test('tie for 2nd: both get 2 VPs', () => {
    const places = [
      { award_id: 1, player_id: 1, place: 1 },
      { award_id: 1, player_id: 2, place: 2 },
      { award_id: 1, player_id: 3, place: 2 },
    ]
    assert.equal(calculateAwardVps(2, places), 2)
    assert.equal(calculateAwardVps(3, places), 2)
  })

  test('player not in any award → 0', () => {
    const places = [{ award_id: 1, player_id: 2, place: 1 }]
    assert.equal(calculateAwardVps(99, places), 0)
  })

  test('3 funded awards, player wins two', () => {
    const places = [
      { award_id: 1, player_id: 1, place: 1 },
      { award_id: 2, player_id: 1, place: 2 },
      { award_id: 3, player_id: 2, place: 1 },
    ]
    assert.equal(calculateAwardVps(1, places), 7) // 5 + 2
    assert.equal(calculateAwardVps(2, places), 5) // 5
  })
})

// ─── calculatePlayerVps ───────────────────────────────────────────────────────

describe('calculatePlayerVps', () => {
  test('basic calculation', () => {
    const player = { tr: 25, greeneries: 4, city_adjacent_greeneries: 3, card_vps: 12 }
    const result = calculatePlayerVps(player, 10, 5)
    assert.equal(result.tr, 25)
    assert.equal(result.greeneryVps, 4)
    assert.equal(result.cityVps, 3)
    assert.equal(result.milestoneVps, 10)
    assert.equal(result.awardVps, 5)
    assert.equal(result.cardVps, 12)
    assert.equal(result.total, 59) // 25+4+3+10+5+12
  })

  test('solo game with no milestones or awards', () => {
    const player = { tr: 30, greeneries: 5, city_adjacent_greeneries: 6, card_vps: 20 }
    const result = calculatePlayerVps(player, 0, 0)
    assert.equal(result.total, 61) // 30+5+6+0+0+20
  })

  test('zero card VPs', () => {
    const player = { tr: 20, greeneries: 0, city_adjacent_greeneries: 0, card_vps: 0 }
    const result = calculatePlayerVps(player, 0, 0)
    assert.equal(result.total, 20)
  })

  test('all components at minimum', () => {
    const player = { tr: 0, greeneries: 0, city_adjacent_greeneries: 0, card_vps: 0 }
    const result = calculatePlayerVps(player, 0, 0)
    assert.equal(result.total, 0)
  })
})

// ─── rankPlayers ──────────────────────────────────────────────────────────────

describe('rankPlayers', () => {
  test('no ties — sequential ranks', () => {
    const players = [
      { id: 1, total_vps: 50 },
      { id: 2, total_vps: 40 },
      { id: 3, total_vps: 30 },
    ]
    const ranked = rankPlayers(players)
    assert.equal(ranked[0].final_rank, 1)
    assert.equal(ranked[1].final_rank, 2)
    assert.equal(ranked[2].final_rank, 3)
  })

  test('two players tied for 1st → both rank 1, next is rank 3', () => {
    const players = [
      { id: 1, total_vps: 50 },
      { id: 2, total_vps: 50 },
      { id: 3, total_vps: 30 },
    ]
    const ranked = rankPlayers(players)
    const p1 = ranked.find(p => p.id === 1)
    const p2 = ranked.find(p => p.id === 2)
    const p3 = ranked.find(p => p.id === 3)
    assert.equal(p1.final_rank, 1)
    assert.equal(p2.final_rank, 1)
    assert.equal(p3.final_rank, 3)
  })

  test('two players tied for 2nd → both rank 2', () => {
    const players = [
      { id: 1, total_vps: 60 },
      { id: 2, total_vps: 40 },
      { id: 3, total_vps: 40 },
    ]
    const ranked = rankPlayers(players)
    const p1 = ranked.find(p => p.id === 1)
    const p2 = ranked.find(p => p.id === 2)
    const p3 = ranked.find(p => p.id === 3)
    assert.equal(p1.final_rank, 1)
    assert.equal(p2.final_rank, 2)
    assert.equal(p3.final_rank, 2)
  })

  test('all tied → all rank 1', () => {
    const players = [
      { id: 1, total_vps: 50 },
      { id: 2, total_vps: 50 },
      { id: 3, total_vps: 50 },
    ]
    const ranked = rankPlayers(players)
    assert.ok(ranked.every(p => p.final_rank === 1))
  })

  test('single player → rank 1', () => {
    const players = [{ id: 1, total_vps: 45 }]
    const ranked = rankPlayers(players)
    assert.equal(ranked[0].final_rank, 1)
  })

  test('VP tie broken by M€ — higher M€ wins (different ranks)', () => {
    const players = [
      { id: 1, total_vps: 50, mega_credits: 30 },
      { id: 2, total_vps: 50, mega_credits: 20 },
    ]
    const ranked = rankPlayers(players)
    const p1 = ranked.find(p => p.id === 1)
    const p2 = ranked.find(p => p.id === 2)
    assert.equal(p1.final_rank, 1)
    assert.equal(p2.final_rank, 2)
  })

  test('VP tie with same M€ — still share same rank', () => {
    const players = [
      { id: 1, total_vps: 50, mega_credits: 25 },
      { id: 2, total_vps: 50, mega_credits: 25 },
    ]
    const ranked = rankPlayers(players)
    const p1 = ranked.find(p => p.id === 1)
    const p2 = ranked.find(p => p.id === 2)
    assert.equal(p1.final_rank, 1)
    assert.equal(p2.final_rank, 1)
  })

  test('does not mutate input array', () => {
    const players = [
      { id: 1, total_vps: 30 },
      { id: 2, total_vps: 50 },
    ]
    rankPlayers(players)
    // Input should remain in original order
    assert.equal(players[0].id, 1)
    assert.equal(players[1].id, 2)
  })
})

// ─── Venus Next expansion ─────────────────────────────────────────────────────

describe('Venus Next expansion', () => {
  test('Hoverlord milestone scores 5 VP (same as any milestone)', () => {
    const player = { tr: 20, greeneries: 0, city_adjacent_greeneries: 0, card_vps: 0 }
    const result = calculatePlayerVps(player, 5, 0)
    assert.equal(result.milestoneVps, 5)
    assert.equal(result.total, 25)
  })

  test('Venuphile award 1st place scores 5 VP', () => {
    const places = [{ award_id: 10, player_id: 1, place: 1 }]
    assert.equal(calculateAwardVps(1, places), 5)
  })

  test('Venuphile award 2nd place scores 2 VP', () => {
    const places = [{ award_id: 10, player_id: 1, place: 2 }]
    assert.equal(calculateAwardVps(1, places), 2)
  })

  test('standard scoring unaffected when venus_next is off (no extra names needed)', () => {
    // calculatePlayerVps and award VP math are name-agnostic — names are validated at
    // controller level, not in the scoring service. This confirms a standard 5-milestone
    // game scores identically regardless of which expansion flag is set.
    const player = { tr: 25, greeneries: 4, city_adjacent_greeneries: 3, card_vps: 12 }
    const result = calculatePlayerVps(player, 10, 5)
    assert.equal(result.total, 59) // 25+4+3+10+5+12 — same as base game test
  })
})
