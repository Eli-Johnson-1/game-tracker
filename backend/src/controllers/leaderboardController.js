const { getDb } = require('../db/database')

function getSiteLeaderboard(req, res, next) {
  try {
    const db = getDb()

    const rows = db.prepare(`
      SELECT *, (gr_wins + tm_wins) AS games_won, (gr_played + tm_played) AS games_played
      FROM (
        -- Registered users: Gin Rummy + Terraforming Mars
        SELECT
          'u:' || u.id AS row_key,
          u.username AS player_name,
          (
            SELECT COUNT(*) FROM gin_rummy_games
            WHERE winner_id = u.id AND status = 'complete'
          ) AS gr_wins,
          (
            SELECT COUNT(*) FROM tm_game_players p
            JOIN tm_games g ON g.id = p.game_id
            WHERE p.user_id = u.id AND p.final_rank = 1 AND g.status = 'complete'
          ) AS tm_wins,
          (
            SELECT COUNT(*) FROM gin_rummy_games
            WHERE (player1_id = u.id OR player2_id = u.id) AND status = 'complete'
          ) AS gr_played,
          (
            SELECT COUNT(*) FROM tm_game_players p
            JOIN tm_games g ON g.id = p.game_id
            WHERE p.user_id = u.id AND g.status = 'complete'
          ) AS tm_played
        FROM users u

        UNION ALL

        -- Guest players: Terraforming Mars only, grouped by name
        SELECT
          'g:' || p.player_name AS row_key,
          p.player_name,
          0 AS gr_wins,
          SUM(CASE WHEN p.final_rank = 1 THEN 1 ELSE 0 END) AS tm_wins,
          0 AS gr_played,
          COUNT(*) AS tm_played
        FROM tm_game_players p
        JOIN tm_games g ON g.id = p.game_id AND g.status = 'complete'
        WHERE p.user_id IS NULL
        GROUP BY p.player_name
      )
      WHERE (gr_played + tm_played) > 0
      ORDER BY games_won DESC, games_played ASC
    `).all()

    res.json({ leaderboard: rows })
  } catch (err) {
    next(err)
  }
}

module.exports = { getSiteLeaderboard }
