const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { calculateHandResult, checkEndGame, calculateEndGameScoring } = require('./ginRummyScoring')

const settings = {
  gin_bonus: 20,
  big_gin_bonus: 31,
  undercut_bonus: 10,
  game_bonus: 100,
  line_bonus: 20,
  shutout_extra_game_bonus: 100,
  shutout_enabled: true,
  gin_rummy_win_threshold: 100,
}

describe('calculateHandResult', () => {
  test('knock — knocker wins', () => {
    const result = calculateHandResult('knock', 5, 22, settings)
    assert.equal(result.handType, 'knock')
    assert.equal(result.winner, 'knocker')
    assert.equal(result.pointsScored, 17) // 22 - 5
  })

  test('knock — defender has fewer deadwood (undercut)', () => {
    const result = calculateHandResult('knock', 10, 4, settings)
    assert.equal(result.handType, 'undercut')
    assert.equal(result.winner, 'defender')
    assert.equal(result.pointsScored, 16) // (10 - 4) + 10 undercut bonus
  })

  test('knock — equal deadwood is undercut', () => {
    const result = calculateHandResult('knock', 8, 8, settings)
    assert.equal(result.handType, 'undercut')
    assert.equal(result.winner, 'defender')
    assert.equal(result.pointsScored, 10) // 0 diff + 10 undercut bonus
  })

  test('gin', () => {
    const result = calculateHandResult('gin', null, 18, settings)
    assert.equal(result.handType, 'gin')
    assert.equal(result.winner, 'knocker')
    assert.equal(result.pointsScored, 38) // 18 + 20 gin bonus
  })

  test('gin with 0 defender deadwood still awards gin bonus', () => {
    const result = calculateHandResult('gin', null, 0, settings)
    assert.equal(result.pointsScored, 20) // 0 + 20
  })

  test('big gin', () => {
    const result = calculateHandResult('big_gin', null, 14, settings)
    assert.equal(result.handType, 'big_gin')
    assert.equal(result.winner, 'knocker')
    assert.equal(result.pointsScored, 45) // 14 + 31 big gin bonus
  })

  test('unknown hand type throws', () => {
    assert.throws(() => calculateHandResult('invalid', 5, 10, settings), /Unknown hand type/)
  })
})

describe('checkEndGame', () => {
  test('returns false when both under threshold', () => {
    assert.equal(checkEndGame(80, 90, settings), false)
  })

  test('returns true when player1 meets threshold', () => {
    assert.equal(checkEndGame(100, 50, settings), true)
  })

  test('returns true when player2 exceeds threshold', () => {
    assert.equal(checkEndGame(60, 120, settings), true)
  })

  test('returns true when both exceed threshold', () => {
    assert.equal(checkEndGame(105, 110, settings), true)
  })
})

describe('calculateEndGameScoring', () => {
  const game = { player1_id: 1, player2_id: 2 }

  function makeHand(winnerId, p1Total, p2Total) {
    return { winner_id: winnerId, player1_running_total: p1Total, player2_running_total: p2Total }
  }

  test('winner gets game bonus + line bonuses', () => {
    const hands = [
      makeHand(1, 30, 0),
      makeHand(2, 30, 15),
      makeHand(1, 65, 15),
      makeHand(1, 105, 15),
    ]
    const result = calculateEndGameScoring(game, hands, settings)
    assert.equal(result.winner_id, 1)
    assert.equal(result.is_shutout, false)
    // p1: 105 running + (3 hands × 20) line + 100 game = 265
    assert.equal(result.player1_final_score, 265)
    // p2: 15 running + (1 hand × 20) line = 35
    assert.equal(result.player2_final_score, 35)
  })

  test('shutout: loser won zero hands', () => {
    const hands = [
      makeHand(1, 40, 0),
      makeHand(1, 80, 0),
      makeHand(1, 110, 0),
    ]
    const result = calculateEndGameScoring(game, hands, settings)
    assert.equal(result.winner_id, 1)
    assert.equal(result.is_shutout, true)
    // p1: 110 + (3 × 20) + 100 game + 100 shutout = 370
    assert.equal(result.player1_final_score, 370)
    // p2: 0 + 0 line = 0
    assert.equal(result.player2_final_score, 0)
  })

  test('shutout disabled: no extra bonus even if loser won zero hands', () => {
    const noShutoutSettings = { ...settings, shutout_enabled: false }
    const hands = [
      makeHand(1, 110, 0),
    ]
    const result = calculateEndGameScoring(game, hands, noShutoutSettings)
    assert.equal(result.is_shutout, false)
    // p1: 110 + (1 × 20) + 100 game = 230 (no extra shutout bonus)
    assert.equal(result.player1_final_score, 230)
  })

  test('player2 wins', () => {
    const hands = [
      makeHand(2, 0, 50),
      makeHand(2, 0, 105),
    ]
    const result = calculateEndGameScoring(game, hands, settings)
    assert.equal(result.winner_id, 2)
    // p2: 105 + (2 × 20) + 100 game = 245, shutout since p1 won 0
    assert.equal(result.is_shutout, true)
    assert.equal(result.player2_final_score, 345) // 105 + 40 + 100 + 100
    assert.equal(result.player1_final_score, 0)
  })

  test('breakdown object contains expected keys', () => {
    const hands = [makeHand(1, 110, 50)]
    const result = calculateEndGameScoring(game, hands, settings)
    const b = result.breakdown
    assert.ok('player1_running' in b)
    assert.ok('player2_running' in b)
    assert.ok('player1_line_bonus' in b)
    assert.ok('player2_line_bonus' in b)
    assert.ok('winner_game_bonus' in b)
    assert.ok('is_shutout' in b)
  })
})
