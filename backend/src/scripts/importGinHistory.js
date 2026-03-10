#!/usr/bin/env node
/**
 * Import historical Gin Rummy games from a gin.md scoresheet.
 *
 * Usage:
 *   node src/scripts/importGinHistory.js <path-to-gin.md> [--dry-run] [--player1=<username>] [--player2=<username>]
 *
 * Defaults: --player1=Kylie --player2=Eli
 *
 * The scoresheet has one markdown table per game. Each data row = one hand.
 * A filled cell means that player won the hand and scored those points.
 *
 * Special-case rules for the Kylie vs. Eli historical data:
 *   SKIP_INDICES           = [0, 1, 11, 18]  — spurious or incomplete, discard entirely
 *   FORCE_COMPLETE_INDICES = [6, 7, 13]       — incomplete, award win to the current leader
 */

const fs   = require('fs')
const path = require('path')

const { getDb }            = require('../db/database')
const { getSettingsMap }   = require('../controllers/settingsController')
const { calculateEndGameScoring } = require('../services/ginRummyScoring')

// ─── Configuration ────────────────────────────────────────────────────────────

const SKIP_INDICES           = new Set([0, 1, 11, 18])
const FORCE_COMPLETE_INDICES = new Set([6, 7, 13])

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args       = process.argv.slice(2)
const filePath   = args.find(a => !a.startsWith('--'))
const dryRun     = args.includes('--dry-run')
const player1Arg = (args.find(a => a.startsWith('--player1=')) || '').split('=')[1] || 'Kylie'
const player2Arg = (args.find(a => a.startsWith('--player2=')) || '').split('=')[1] || 'Eli'

if (!filePath) {
  console.error('Usage: node importGinHistory.js <path> [--dry-run] [--player1=<name>] [--player2=<name>]')
  process.exit(1)
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a gin.md scoresheet into an array of game arrays.
 * Each game is an array of { kylie: number|null, eli: number|null }.
 *
 * Rules:
 *  - Separator rows (| --- |) always start a new game
 *  - Header rows (non-numeric cell text) that follow a non-empty game start a new game
 *    (handles the last merged block that contains two games back-to-back)
 *  - Data before the very first separator forms its own game (the spurious K:12 case)
 *  - Both-null rows are skipped
 *  - Rows where either cell is 0 are skipped (data-entry error)
 *  - Dual-column rows (both non-null, non-zero) become two separate hands: player1 first
 */
function parseGinMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines   = content.split('\n')

  const games      = []
  let   currentGame = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue

    const cells = trimmed.split('|').slice(1, -1).map(c => c.trim())
    if (cells.length < 2) continue

    // Separator row: every non-empty cell matches /^-+$/
    const nonEmpty = cells.filter(c => c !== '')
    if (nonEmpty.length > 0 && nonEmpty.every(c => /^-+$/.test(c))) {
      currentGame = []
      games.push(currentGame)
      continue
    }

    // Header row: at least one cell has non-numeric, non-empty text
    if (cells.some(c => c !== '' && isNaN(c))) {
      if (currentGame && currentGame.length > 0) {
        // Mid-block header — treat as a game boundary
        currentGame = null
      }
      continue
    }

    // Data row
    const kylie = cells[0] !== '' ? parseInt(cells[0], 10) : null
    const eli   = cells[1] !== '' ? parseInt(cells[1], 10) : null

    if (kylie === null && eli === null) continue   // empty row
    if (kylie === 0    || eli === 0)    continue   // 0-point hand — data error

    if (!currentGame) {
      // Data before the very first separator (the spurious K:12 row)
      currentGame = []
      games.push(currentGame)
    }

    // Dual-column row: split into two hands, player1 (Kylie) first
    if (kylie !== null && eli !== null) {
      currentGame.push({ kylie, eli: null })
      currentGame.push({ kylie: null, eli })
      continue
    }

    currentGame.push({ kylie, eli })
  }

  return games
}

// ─── Import ───────────────────────────────────────────────────────────────────

function importGames(games, p1Id, p2Id, p1Name, p2Name, settings, db) {
  let imported = 0
  let skipped  = 0

  for (let idx = 0; idx < games.length; idx++) {
    const hands = games[idx]

    if (SKIP_INDICES.has(idx) || hands.length === 0) {
      console.log(`  [SKIP]           game ${idx} (${hands.length} hands)`)
      skipped++
      continue
    }

    const forceComplete = FORCE_COMPLETE_INDICES.has(idx)

    // Build hand rows with running totals
    let p1Total = 0
    let p2Total = 0

    const handRows = hands.map((hand, i) => {
      const winnerId = hand.kylie !== null ? p1Id : p2Id
      const points   = hand.kylie !== null ? hand.kylie : hand.eli

      if (winnerId === p1Id) p1Total += points
      else                   p2Total += points

      return {
        hand_number:           i + 1,
        knocker_id:            winnerId,
        winner_id:             winnerId,
        points_scored:         points,
        player1_running_total: p1Total,
        player2_running_total: p2Total,
      }
    })

    // Calculate end-game scoring (works for both normal and force-complete)
    const gameObj = { player1_id: p1Id, player2_id: p2Id }
    const endGame = calculateEndGameScoring(gameObj, handRows, settings)
    const winnerName = endGame.winner_id === p1Id ? p1Name : p2Name

    const label = forceComplete ? '[FORCE_COMPLETE]' : '[IMPORT]        '
    console.log(
      `  ${label} game ${idx}: ${String(hands.length).padStart(2)} hands | ` +
      `${p1Name}=${p1Total} ${p2Name}=${p2Total} | ` +
      `winner=${winnerName}${endGame.is_shutout ? ' (shutout)' : ''}`
    )

    if (!dryRun) {
      db.transaction(() => {
        const gameId = db.prepare(`
          INSERT INTO gin_rummy_games
            (player1_id, player2_id, winner_id, player1_final_score, player2_final_score,
             status, is_shutout, started_at, completed_at, imported)
          VALUES (?, ?, ?, ?, ?, 'complete', ?, datetime('now'), datetime('now'), 1)
        `).run(
          p1Id, p2Id,
          endGame.winner_id,
          endGame.player1_final_score,
          endGame.player2_final_score,
          endGame.is_shutout ? 1 : 0,
        ).lastInsertRowid

        const insertHand = db.prepare(`
          INSERT INTO gin_rummy_hands
            (game_id, hand_number, hand_type, knocker_id, winner_id,
             knocker_deadwood, defender_deadwood, points_scored,
             player1_running_total, player2_running_total, played_at)
          VALUES (?, ?, 'imported', ?, ?, NULL, NULL, ?, ?, ?, datetime('now'))
        `)

        for (const row of handRows) {
          insertHand.run(
            gameId, row.hand_number, row.knocker_id, row.winner_id,
            row.points_scored, row.player1_running_total, row.player2_running_total,
          )
        }
      })()
    }

    imported++
  }

  return { imported, skipped }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (dryRun) console.log('DRY RUN — no changes will be written\n')

  const games = parseGinMd(filePath)
  console.log(`Parsed ${games.length} game blocks from ${path.basename(filePath)}\n`)

  const db       = getDb()
  const settings = getSettingsMap(db)

  const p1Row = db.prepare('SELECT id, username FROM users WHERE username = ?').get(player1Arg)
  const p2Row = db.prepare('SELECT id, username FROM users WHERE username = ?').get(player2Arg)

  if (!p1Row) { console.error(`Player not found: "${player1Arg}". Register this user first.`); process.exit(1) }
  if (!p2Row) { console.error(`Player not found: "${player2Arg}". Register this user first.`); process.exit(1) }

  console.log(`Players: ${p1Row.username} (id=${p1Row.id}) vs ${p2Row.username} (id=${p2Row.id})\n`)

  const { imported, skipped } = importGames(
    games,
    p1Row.id, p2Row.id,
    p1Row.username, p2Row.username,
    settings, db,
  )

  console.log(`\n${dryRun ? 'Would import' : 'Imported'}: ${imported} game(s) | Skipped: ${skipped}`)
}

main()
