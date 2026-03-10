const name = '003_bonus_toggles'

function up(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description)
    VALUES (@key, @value, @description)
  `)

  insert.run({ key: 'game_bonus_enabled',  value: 'true', description: 'Whether the game bonus is applied at end-game' })
  insert.run({ key: 'line_bonus_enabled',  value: 'true', description: 'Whether the line/box bonus is applied at end-game' })
}

module.exports = { name, up }
