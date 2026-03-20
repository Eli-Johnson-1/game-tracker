const name = '008_tm_imported'

function up(db) {
  db.exec(`
    ALTER TABLE tm_games ADD COLUMN imported INTEGER NOT NULL DEFAULT 0
  `)
}

module.exports = { name, up }
