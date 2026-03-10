const { getDb } = require('../db/database')

function getSiteLeaderboard(req, res, next) {
  try {
    const db = getDb()

    const rows = db.prepare(`
      SELECT
        u.id,
        u.username,
        COUNT(g.id) AS games_won,
        (
          SELECT COUNT(*) FROM gin_rummy_games
          WHERE player1_id = u.id OR player2_id = u.id
        ) AS games_played
      FROM users u
      LEFT JOIN gin_rummy_games g ON g.winner_id = u.id AND g.status = 'complete'
      GROUP BY u.id
      ORDER BY games_won DESC, games_played ASC
    `).all()

    res.json({ leaderboard: rows })
  } catch (err) {
    next(err)
  }
}

module.exports = { getSiteLeaderboard }
