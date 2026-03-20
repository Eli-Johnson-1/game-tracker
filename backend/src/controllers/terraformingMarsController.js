const { getDb } = require('../db/database')
const { evaluateSafeExpression, calculateAwardVps, calculatePlayerVps, rankPlayers } = require('../services/terraformingMarsScoring')
const { analyzeBoardPhoto } = require('../services/terraformingMarsPhotoAnalysis')
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors')

const VALID_COLORS = ['red', 'green', 'blue', 'yellow', 'black']
const BASE_MILESTONES = ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner']
const BASE_AWARDS = ['Landlord', 'Banker', 'Scientist', 'Thermalist', 'Miner']
const VENUS_MILESTONES = ['Hoverlord']
const VENUS_AWARDS = ['Venuphile']

// ─── Games ──────────────────────────────────────────────────────────────────

function listGames(req, res, next) {
  try {
    const db = getDb()

    const games = db.prepare(`
      SELECT
        g.*,
        u.username AS created_by_username,
        (SELECT COUNT(*) FROM tm_game_players p WHERE p.game_id = g.id) AS player_count
      FROM tm_games g
      JOIN users u ON u.id = g.created_by
      ORDER BY g.imported ASC, g.created_at DESC
    `).all()

    // Attach players to each game
    const gameIds = games.map(g => g.id)
    if (gameIds.length === 0) return res.json({ games: [] })

    const players = db.prepare(`
      SELECT * FROM tm_game_players WHERE game_id IN (${gameIds.map(() => '?').join(',')})
      ORDER BY seat_order ASC
    `).all(...gameIds)

    const playersByGame = {}
    for (const p of players) {
      if (!playersByGame[p.game_id]) playersByGame[p.game_id] = []
      playersByGame[p.game_id].push(p)
    }

    const result = games.map(g => ({ ...g, players: playersByGame[g.id] || [] }))
    res.json({ games: result })
  } catch (err) { next(err) }
}

function createGame(req, res, next) {
  try {
    const db = getDb()
    const { mode, players, venus_next, played_at, imported } = req.body
    const createdBy = req.user.id

    // Validate colors are unique
    const colors = players.map(p => p.color)
    if (new Set(colors).size !== colors.length) {
      return next(new ValidationError('Each player must have a unique color'))
    }

    // Validate solo has exactly 1 player
    if (mode === 'solo' && players.length !== 1) {
      return next(new ValidationError('Solo mode requires exactly 1 player'))
    }
    if (mode === 'multiplayer' && players.length < 2) {
      return next(new ValidationError('Multiplayer mode requires at least 2 players'))
    }

    // Validate played_at if provided
    let resolvedDate = null
    if (!imported && played_at) {
      const d = new Date(played_at)
      if (isNaN(d.getTime())) {
        return next(new ValidationError('Invalid played_at date'))
      }
      if (d > new Date()) {
        return next(new ValidationError('played_at cannot be in the future'))
      }
      resolvedDate = played_at
    }

    // Validate user_ids exist when provided
    for (const p of players) {
      if (p.user_id) {
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(p.user_id)
        if (!user) return next(new NotFoundError(`User ${p.user_id} not found`))
      }
    }

    const doCreate = db.transaction(() => {
      const gameResult = resolvedDate
        ? db.prepare(`
            INSERT INTO tm_games (mode, created_by, venus_next, imported, created_at) VALUES (?, ?, ?, ?, ?)
          `).run(mode, createdBy, venus_next ? 1 : 0, 0, resolvedDate)
        : db.prepare(`
            INSERT INTO tm_games (mode, created_by, venus_next, imported) VALUES (?, ?, ?, ?)
          `).run(mode, createdBy, venus_next ? 1 : 0, imported ? 1 : 0)

      const gameId = gameResult.lastInsertRowid

      for (let i = 0; i < players.length; i++) {
        const p = players[i]
        db.prepare(`
          INSERT INTO tm_game_players (game_id, user_id, player_name, color, seat_order)
          VALUES (?, ?, ?, ?, ?)
        `).run(gameId, p.user_id || null, p.player_name, p.color, i + 1)
      }

      return gameId
    })

    const gameId = doCreate()
    const game = getFullGame(db, gameId)
    res.status(201).json({ game })
  } catch (err) { next(err) }
}

function getGame(req, res, next) {
  try {
    const db = getDb()
    const game = getFullGame(db, req.params.id)
    if (!game) return next(new NotFoundError('Game not found'))
    res.json({ game })
  } catch (err) { next(err) }
}

function deleteGame(req, res, next) {
  try {
    const db = getDb()
    const game = db.prepare('SELECT * FROM tm_games WHERE id = ?').get(req.params.id)
    if (!game) return next(new NotFoundError('Game not found'))

    const isAdmin = process.env.ADMIN_USERNAME
      ? req.user.username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()
      : false
    if (game.created_by !== req.user.id && !isAdmin) {
      return next(new ForbiddenError('Only the game creator can delete this game'))
    }

    db.prepare('DELETE FROM tm_games WHERE id = ?').run(req.params.id)
    res.json({ message: 'Game deleted' })
  } catch (err) { next(err) }
}

// ─── Shared scoring logic ────────────────────────────────────────────────────

/**
 * Validate body, evaluate expressions, and calculate per-player VPs.
 * Throws ValidationError on invalid input.
 * Returns { scoredPlayers, rankMap, milestones, awards, generation, solo_terraformed }
 */
function _processBody(game, dbPlayerMap, body) {
  const { generation, solo_terraformed, players, milestones = [], awards = [] } = body

  for (const p of players) {
    if (!dbPlayerMap[p.player_id]) {
      throw new ValidationError(`Player ${p.player_id} is not in this game`)
    }
  }

  const validMilestones = game.venus_next
    ? [...BASE_MILESTONES, ...VENUS_MILESTONES]
    : BASE_MILESTONES
  const validAwards = game.venus_next
    ? [...BASE_AWARDS, ...VENUS_AWARDS]
    : BASE_AWARDS

  if (game.mode === 'solo' && milestones.length > 0) throw new ValidationError('Solo mode does not have milestones')
  if (milestones.length > 3) throw new ValidationError('Maximum 3 milestones can be claimed')
  for (const m of milestones) {
    if (!game.imported && !validMilestones.includes(m.milestone_name)) throw new ValidationError(`Invalid milestone: ${m.milestone_name}`)
    if (!dbPlayerMap[m.player_id]) throw new ValidationError(`Milestone player ${m.player_id} not in this game`)
  }

  if (game.mode === 'solo' && awards.length > 0) throw new ValidationError('Solo mode does not have awards')
  if (awards.length > 3) throw new ValidationError('Maximum 3 awards can be funded')
  for (const a of awards) {
    if (!game.imported && !validAwards.includes(a.award_name)) throw new ValidationError(`Invalid award: ${a.award_name}`)
    for (const ap of a.places || []) {
      if (!dbPlayerMap[ap.player_id]) throw new ValidationError(`Award place player ${ap.player_id} not in this game`)
    }
  }

  const cardVpsMap = {}
  for (const p of players) {
    const expr = p.card_vps_expression
    if (expr && expr.trim() !== '') {
      try {
        cardVpsMap[p.player_id] = evaluateSafeExpression(expr)
      } catch (e) {
        throw new ValidationError(`Invalid card VP expression for player ${p.player_id}: ${e.message}`)
      }
    } else {
      cardVpsMap[p.player_id] = 0
    }
  }

  const milestoneVpsMap = {}
  for (const m of milestones) {
    milestoneVpsMap[m.player_id] = (milestoneVpsMap[m.player_id] || 0) + 5
  }

  const allAwardPlacesFlat = []
  for (const a of awards) {
    for (const ap of a.places || []) {
      allAwardPlacesFlat.push({ player_id: ap.player_id, place: ap.place })
    }
  }

  const scoredPlayers = players.map(p => {
    const dbPlayer = dbPlayerMap[p.player_id]
    const playerWithScores = {
      ...dbPlayer,
      tr: p.tr,
      greeneries: p.greeneries,
      city_adjacent_greeneries: p.city_adjacent_greeneries,
      card_vps: cardVpsMap[p.player_id],
    }
    const milestoneVps = milestoneVpsMap[p.player_id] || 0
    const awardVps = calculateAwardVps(p.player_id, allAwardPlacesFlat)
    const vps = calculatePlayerVps(playerWithScores, milestoneVps, awardVps)

    return {
      player_id: p.player_id,
      card_vps_expression: p.card_vps_expression || null,
      tr: p.tr,
      greeneries: p.greeneries,
      city_adjacent_greeneries: p.city_adjacent_greeneries,
      card_vps: vps.cardVps,
      milestone_vps: vps.milestoneVps,
      award_vps: vps.awardVps,
      total_vps: vps.total,
    }
  })

  const ranked = rankPlayers(scoredPlayers.map(p => ({ id: p.player_id, total_vps: p.total_vps })))
  const rankMap = Object.fromEntries(ranked.map(r => [r.id, r.final_rank]))

  return { scoredPlayers, rankMap, milestones, awards, generation, solo_terraformed }
}

/**
 * Write scored results to the DB inside the caller's transaction.
 */
function _writeScores(db, gameId, mode, { scoredPlayers, rankMap, milestones, awards, generation, solo_terraformed }) {
  for (const p of scoredPlayers) {
    db.prepare(`
      UPDATE tm_game_players SET
        tr = ?, greeneries = ?, city_adjacent_greeneries = ?,
        card_vps_expression = ?, card_vps = ?,
        milestone_vps = ?, award_vps = ?, total_vps = ?,
        final_rank = ?
      WHERE id = ?
    `).run(
      p.tr, p.greeneries, p.city_adjacent_greeneries,
      p.card_vps_expression, p.card_vps,
      p.milestone_vps, p.award_vps, p.total_vps,
      rankMap[p.player_id],
      p.player_id
    )
  }

  for (const m of milestones) {
    db.prepare(`
      INSERT INTO tm_game_milestones (game_id, milestone_name, claimed_by_player_id) VALUES (?, ?, ?)
    `).run(gameId, m.milestone_name, m.player_id)
  }

  for (const a of awards) {
    const awardResult = db.prepare(`
      INSERT INTO tm_game_awards (game_id, award_name) VALUES (?, ?)
    `).run(gameId, a.award_name)
    const awardId = awardResult.lastInsertRowid
    for (const ap of a.places || []) {
      db.prepare(`
        INSERT INTO tm_game_award_places (award_id, player_id, place) VALUES (?, ?, ?)
      `).run(awardId, ap.player_id, ap.place)
    }
  }

  db.prepare(`
    UPDATE tm_games SET
      status = 'complete',
      generation = ?,
      solo_terraformed = ?,
      completed_at = datetime('now')
    WHERE id = ?
  `).run(generation, mode === 'solo' ? (solo_terraformed ? 1 : 0) : null, gameId)
}

// ─── Complete / Edit ──────────────────────────────────────────────────────────

function completeGame(req, res, next) {
  try {
    const db = getDb()
    const gameId = Number(req.params.id)

    const game = db.prepare('SELECT * FROM tm_games WHERE id = ?').get(gameId)
    if (!game) return next(new NotFoundError('Game not found'))
    if (game.status !== 'active') return next(new ValidationError('Game is already complete'))
    if (game.created_by !== req.user.id) return next(new ForbiddenError('Only the game creator can finalize scores'))

    const dbPlayers = db.prepare('SELECT * FROM tm_game_players WHERE game_id = ?').all(gameId)
    const dbPlayerMap = Object.fromEntries(dbPlayers.map(p => [p.id, p]))

    let scored
    try {
      scored = _processBody(game, dbPlayerMap, req.body)
    } catch (e) {
      return next(e)
    }

    db.transaction(() => _writeScores(db, gameId, game.mode, scored))()

    res.json({ game: getFullGame(db, gameId) })
  } catch (err) { next(err) }
}

function editGame(req, res, next) {
  try {
    const db = getDb()
    const gameId = Number(req.params.id)

    const game = db.prepare('SELECT * FROM tm_games WHERE id = ?').get(gameId)
    if (!game) return next(new NotFoundError('Game not found'))
    if (game.status !== 'complete') return next(new ValidationError('Game is not yet complete'))
    const isAdmin = process.env.ADMIN_USERNAME
      ? req.user.username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()
      : false
    if (game.created_by !== req.user.id && !isAdmin) return next(new ForbiddenError('Only the game creator can edit scores'))

    const dbPlayers = db.prepare('SELECT * FROM tm_game_players WHERE game_id = ?').all(gameId)
    const dbPlayerMap = Object.fromEntries(dbPlayers.map(p => [p.id, p]))

    let scored
    try {
      scored = _processBody(game, dbPlayerMap, req.body)
    } catch (e) {
      return next(e)
    }

    db.transaction(() => {
      // Clear existing milestones and awards (award_places cascade via FK)
      db.prepare('DELETE FROM tm_game_milestones WHERE game_id = ?').run(gameId)
      db.prepare('DELETE FROM tm_game_awards WHERE game_id = ?').run(gameId)
      _writeScores(db, gameId, game.mode, scored)
    })()

    res.json({ game: getFullGame(db, gameId) })
  } catch (err) { next(err) }
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function getLeaderboard(req, res, next) {
  try {
    const db = getDb()

    const rows = db.prepare(`
      SELECT * FROM (
        -- Registered users
        SELECT
          'u:' || u.id AS row_key,
          u.username,
          COUNT(DISTINCT g.id) AS games_played,
          SUM(CASE WHEN p.final_rank = 1 THEN 1 ELSE 0 END) AS wins,
          ROUND(AVG(p.total_vps), 1) AS avg_vps,
          MAX(p.total_vps) AS best_vps,
          ROUND(AVG(p.tr), 1) AS avg_tr
        FROM users u
        JOIN tm_game_players p ON p.user_id = u.id
        JOIN tm_games g ON g.id = p.game_id AND g.status = 'complete'
        GROUP BY u.id, u.username

        UNION ALL

        -- Guest players, grouped by name
        SELECT
          'g:' || p.player_name AS row_key,
          p.player_name AS username,
          COUNT(DISTINCT g.id) AS games_played,
          SUM(CASE WHEN p.final_rank = 1 THEN 1 ELSE 0 END) AS wins,
          ROUND(AVG(p.total_vps), 1) AS avg_vps,
          MAX(p.total_vps) AS best_vps,
          ROUND(AVG(p.tr), 1) AS avg_tr
        FROM tm_game_players p
        JOIN tm_games g ON g.id = p.game_id AND g.status = 'complete'
        WHERE p.user_id IS NULL
        GROUP BY p.player_name
      )
      ORDER BY wins DESC, avg_vps DESC
    `).all()

    res.json({ leaderboard: rows })
  } catch (err) { next(err) }
}

// ─── Photo Analysis ───────────────────────────────────────────────────────────

async function analyzePhoto(req, res, next) {
  try {
    if (!req.file) {
      return next(new ValidationError('No image file provided'))
    }

    const { buffer, mimetype } = req.file
    let playerColors
    try {
      playerColors = req.body.playerColors ? JSON.parse(req.body.playerColors) : undefined
    } catch (_) { /* ignore malformed value */ }
    const result = await analyzeBoardPhoto(buffer, mimetype, playerColors)
    res.json(result)
  } catch (err) {
    if (err.statusCode === 503) {
      return res.status(503).json({
        error: err.message,
        hint: 'Add ANTHROPIC_API_KEY to your backend environment variables and restart the server.',
      })
    }
    next(err)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFullGame(db, gameId) {
  const game = db.prepare(`
    SELECT g.*, u.username AS created_by_username
    FROM tm_games g
    JOIN users u ON u.id = g.created_by
    WHERE g.id = ?
  `).get(gameId)

  if (!game) return null

  const players = db.prepare(`
    SELECT p.*, u.username
    FROM tm_game_players p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.game_id = ?
    ORDER BY p.seat_order ASC
  `).all(gameId)

  const milestones = db.prepare(`
    SELECT m.*, p.player_name, p.color
    FROM tm_game_milestones m
    JOIN tm_game_players p ON p.id = m.claimed_by_player_id
    WHERE m.game_id = ?
  `).all(gameId)

  const awards = db.prepare(`
    SELECT a.*
    FROM tm_game_awards a
    WHERE a.game_id = ?
  `).all(gameId)

  for (const award of awards) {
    award.places = db.prepare(`
      SELECT ap.*, p.player_name, p.color
      FROM tm_game_award_places ap
      JOIN tm_game_players p ON p.id = ap.player_id
      WHERE ap.award_id = ?
      ORDER BY ap.place ASC
    `).all(award.id)
  }

  return { ...game, players, milestones, awards }
}

module.exports = { listGames, createGame, getGame, deleteGame, completeGame, editGame, getLeaderboard, analyzePhoto }
