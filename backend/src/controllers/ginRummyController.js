const { getDb } = require('../db/database')
const { getSettingsMap } = require('./settingsController')
const { calculateHandResult, checkEndGame, calculateEndGameScoring } = require('../services/ginRummyScoring')
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors')

// ─── Games ──────────────────────────────────────────────────────────────────

function listGames(req, res, next) {
  try {
    const db = getDb()
    const { status, user_id } = req.query

    let sql = `
      SELECT
        g.*,
        u1.username AS player1_username,
        u2.username AS player2_username,
        w.username  AS winner_username,
        (SELECT COUNT(*) FROM gin_rummy_hands h WHERE h.game_id = g.id) AS hand_count
      FROM gin_rummy_games g
      JOIN users u1 ON u1.id = g.player1_id
      JOIN users u2 ON u2.id = g.player2_id
      LEFT JOIN users w ON w.id = g.winner_id
      WHERE 1=1
    `
    const params = []

    if (status) { sql += ' AND g.status = ?'; params.push(status) }
    if (user_id) { sql += ' AND (g.player1_id = ? OR g.player2_id = ?)'; params.push(user_id, user_id) }

    sql += ' ORDER BY g.started_at DESC'

    const games = db.prepare(sql).all(...params)
    res.json({ games })
  } catch (err) { next(err) }
}

function createGame(req, res, next) {
  try {
    const db = getDb()
    const { opponent_id } = req.body
    const player1_id = req.user.id
    const player2_id = Number(opponent_id)

    if (player1_id === player2_id) {
      return next(new ValidationError('Cannot play against yourself'))
    }

    const opponent = db.prepare('SELECT id FROM users WHERE id = ?').get(player2_id)
    if (!opponent) return next(new NotFoundError('Opponent not found'))

    const result = db.prepare(`
      INSERT INTO gin_rummy_games (player1_id, player2_id) VALUES (?, ?)
    `).run(player1_id, player2_id)

    const game = db.prepare(`
      SELECT g.*, u1.username AS player1_username, u2.username AS player2_username
      FROM gin_rummy_games g
      JOIN users u1 ON u1.id = g.player1_id
      JOIN users u2 ON u2.id = g.player2_id
      WHERE g.id = ?
    `).get(result.lastInsertRowid)

    res.status(201).json({ game })
  } catch (err) { next(err) }
}

function getGame(req, res, next) {
  try {
    const db = getDb()
    const game = db.prepare(`
      SELECT
        g.*,
        u1.username AS player1_username,
        u2.username AS player2_username,
        w.username  AS winner_username
      FROM gin_rummy_games g
      JOIN users u1 ON u1.id = g.player1_id
      JOIN users u2 ON u2.id = g.player2_id
      LEFT JOIN users w ON w.id = g.winner_id
      WHERE g.id = ?
    `).get(req.params.id)

    if (!game) return next(new NotFoundError('Game not found'))

    const hands = db.prepare(`
      SELECT h.*, kn.username AS knocker_username, w.username AS winner_username
      FROM gin_rummy_hands h
      LEFT JOIN users kn ON kn.id = h.knocker_id
      JOIN users w ON w.id = h.winner_id
      WHERE h.game_id = ?
      ORDER BY h.hand_number ASC
    `).all(req.params.id)

    res.json({ game, hands })
  } catch (err) { next(err) }
}

function deleteGame(req, res, next) {
  try {
    const db = getDb()
    const game = db.prepare('SELECT * FROM gin_rummy_games WHERE id = ?').get(req.params.id)
    if (!game) return next(new NotFoundError('Game not found'))

    if (game.player1_id !== req.user.id && game.player2_id !== req.user.id) {
      return next(new ForbiddenError('You are not a participant in this game'))
    }

    db.prepare('DELETE FROM gin_rummy_games WHERE id = ?').run(req.params.id)
    res.json({ message: 'Game deleted' })
  } catch (err) { next(err) }
}

// ─── Hands ───────────────────────────────────────────────────────────────────

function submitHand(req, res, next) {
  try {
    const db = getDb()
    const gameId = Number(req.params.id)

    const game = db.prepare('SELECT * FROM gin_rummy_games WHERE id = ?').get(gameId)
    if (!game) return next(new NotFoundError('Game not found'))
    if (game.status !== 'active') return next(new ValidationError('Game is already complete'))

    const { player1_id, player2_id } = game
    if (req.user.id !== player1_id && req.user.id !== player2_id) {
      return next(new ForbiddenError('You are not a participant in this game'))
    }

    const { hand_type, knocker_id, knocker_deadwood, defender_deadwood } = req.body

    // Determine knocker and defender IDs
    const knockerId = knocker_id ? Number(knocker_id) : null
    if ((hand_type === 'knock') && !knockerId) {
      return next(new ValidationError('knocker_id required for knock/gin/big_gin'))
    }
    const defenderId = knockerId === player1_id ? player2_id : player1_id

    // Validate deadwood inputs
    if (hand_type === 'knock') {
      if (knocker_deadwood === undefined || knocker_deadwood === null || defender_deadwood === undefined || defender_deadwood === null) {
        return next(new ValidationError('knocker_deadwood and defender_deadwood required for knock'))
      }
      if (knocker_deadwood > 10) {
        return next(new ValidationError('Knocker deadwood cannot exceed 10'))
      }
    }
    if ((hand_type === 'gin' || hand_type === 'big_gin') && (defender_deadwood === undefined || defender_deadwood === null)) {
      return next(new ValidationError('defender_deadwood required for gin/big_gin'))
    }

    const settings = getSettingsMap(db)

    const result = calculateHandResult(
      hand_type,
      hand_type === 'knock' ? Number(knocker_deadwood) : null,
      hand_type !== 'gin' && hand_type !== 'big_gin' ? Number(defender_deadwood) : Number(defender_deadwood),
      settings
    )

    const winnerId  = result.winner === 'knocker' ? knockerId : defenderId
    const actualKnockerId = (hand_type === 'knock') ? knockerId : null

    // Get current running totals
    const lastHand = db.prepare(`
      SELECT player1_running_total, player2_running_total
      FROM gin_rummy_hands WHERE game_id = ? ORDER BY hand_number DESC LIMIT 1
    `).get(gameId)

    let p1Total = lastHand ? lastHand.player1_running_total : 0
    let p2Total = lastHand ? lastHand.player2_running_total : 0

    if (winnerId === player1_id) p1Total += result.pointsScored
    else p2Total += result.pointsScored

    const handCount = db.prepare('SELECT COUNT(*) AS cnt FROM gin_rummy_hands WHERE game_id = ?').get(gameId)
    const handNumber = handCount.cnt + 1

    const insertHand = db.prepare(`
      INSERT INTO gin_rummy_hands
        (game_id, hand_number, hand_type, knocker_id, winner_id,
         knocker_deadwood, defender_deadwood, points_scored,
         player1_running_total, player2_running_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let endGameResult = null

    const doInsert = db.transaction(() => {
      insertHand.run(
        gameId, handNumber, result.handType, actualKnockerId, winnerId,
        hand_type === 'knock' ? Number(knocker_deadwood) : null,
        Number(defender_deadwood),
        result.pointsScored,
        p1Total, p2Total
      )

      const newHandId = db.prepare('SELECT last_insert_rowid() AS id').get().id

      if (checkEndGame(p1Total, p2Total, settings)) {
        const allHands = db.prepare(
          'SELECT * FROM gin_rummy_hands WHERE game_id = ? ORDER BY hand_number ASC'
        ).all(gameId)

        const eg = calculateEndGameScoring(game, allHands, settings)

        db.prepare(`
          UPDATE gin_rummy_games
          SET status = 'complete', winner_id = ?, player1_final_score = ?,
              player2_final_score = ?, is_shutout = ?, completed_at = datetime('now')
          WHERE id = ?
        `).run(eg.winner_id, eg.player1_final_score, eg.player2_final_score, eg.is_shutout ? 1 : 0, gameId)

        endGameResult = eg
      }

      return newHandId
    })

    const newHandId = doInsert()
    const hand = db.prepare('SELECT * FROM gin_rummy_hands WHERE id = ?').get(newHandId)

    res.status(201).json({
      hand,
      player1_running_total: p1Total,
      player2_running_total: p2Total,
      end_game: endGameResult,
    })
  } catch (err) { next(err) }
}

function undoLastHand(req, res, next) {
  try {
    const db = getDb()
    const gameId = Number(req.params.id)
    const handId = Number(req.params.handId)

    const game = db.prepare('SELECT * FROM gin_rummy_games WHERE id = ?').get(gameId)
    if (!game) return next(new NotFoundError('Game not found'))

    if (game.player1_id !== req.user.id && game.player2_id !== req.user.id) {
      return next(new ForbiddenError('You are not a participant in this game'))
    }

    const lastHand = db.prepare(
      'SELECT * FROM gin_rummy_hands WHERE game_id = ? ORDER BY hand_number DESC LIMIT 1'
    ).get(gameId)

    if (!lastHand || lastHand.id !== handId) {
      return next(new ValidationError('Can only undo the most recent hand'))
    }

    db.transaction(() => {
      db.prepare('DELETE FROM gin_rummy_hands WHERE id = ?').run(handId)
      // If game was complete, reopen it
      if (game.status === 'complete') {
        db.prepare(`
          UPDATE gin_rummy_games
          SET status = 'active', winner_id = NULL,
              player1_final_score = NULL, player2_final_score = NULL,
              is_shutout = 0, completed_at = NULL
          WHERE id = ?
        `).run(gameId)
      }
    })()

    res.json({ message: 'Hand undone' })
  } catch (err) { next(err) }
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function getLeaderboard(req, res, next) {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT
        u.id,
        u.username,
        COUNT(DISTINCT g.id) AS games_won,
        SUM(CASE WHEN g.winner_id = u.id THEN g.player1_final_score
                 WHEN g.winner_id != u.id AND (g.player1_id = u.id OR g.player2_id = u.id)
                   THEN CASE WHEN g.player1_id = u.id THEN g.player1_final_score ELSE g.player2_final_score END
                 ELSE 0 END) AS total_score,
        (SELECT COUNT(*) FROM gin_rummy_games
         WHERE (player1_id = u.id OR player2_id = u.id) AND status = 'complete') AS games_played,
        COUNT(DISTINCT CASE WHEN g.is_shutout = 1 THEN g.id END) AS shutouts
      FROM users u
      LEFT JOIN gin_rummy_games g ON g.winner_id = u.id AND g.status = 'complete'
      GROUP BY u.id
      ORDER BY games_won DESC, total_score DESC
    `).all()

    res.json({ leaderboard: rows })
  } catch (err) { next(err) }
}

module.exports = { listGames, createGame, getGame, deleteGame, submitHand, undoLastHand, getLeaderboard }
