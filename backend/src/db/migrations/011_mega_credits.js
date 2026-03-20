module.exports = {
  name: '011_mega_credits',
  up(db) {
    db.exec(`ALTER TABLE tm_game_players ADD COLUMN mega_credits INTEGER NOT NULL DEFAULT 0`)
  },
}
