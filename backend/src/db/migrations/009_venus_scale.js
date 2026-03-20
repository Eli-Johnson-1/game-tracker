const name = '009_venus_scale'

function up(db) {
  db.exec(`
    ALTER TABLE tm_games ADD COLUMN venus_scale INTEGER
  `)
}

module.exports = { name, up }
