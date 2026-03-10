const name = '002_settings'

const DEFAULT_SETTINGS = [
  { key: 'gin_bonus',                  value: '20',   description: 'Points awarded for going Gin' },
  { key: 'big_gin_bonus',              value: '31',   description: 'Points awarded for going Big Gin' },
  { key: 'undercut_bonus',             value: '10',   description: 'Bonus points awarded to defender on undercut' },
  { key: 'game_bonus',                 value: '100',  description: 'Points awarded to winner when game ends' },
  { key: 'line_bonus',                 value: '20',   description: 'Points per hand won, awarded at game end' },
  { key: 'shutout_extra_game_bonus',   value: '100',  description: 'Extra game bonus if loser won zero hands' },
  { key: 'shutout_enabled',            value: 'true', description: 'Whether shutout bonus is applied' },
  { key: 'gin_rummy_win_threshold',    value: '100',  description: 'Running score threshold that triggers end-game' },
]

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      description TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description)
    VALUES (@key, @value, @description)
  `)

  for (const row of DEFAULT_SETTINGS) {
    insert.run(row)
  }
}

module.exports = { name, up }
