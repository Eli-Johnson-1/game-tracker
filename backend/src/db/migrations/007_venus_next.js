const name = '007_venus_next'

function up(db) {
  db.exec(`
    ALTER TABLE tm_games ADD COLUMN venus_next INTEGER NOT NULL DEFAULT 0
  `)
}

module.exports = { name, up }
