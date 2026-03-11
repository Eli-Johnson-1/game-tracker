const name = '005_terraforming_mars'

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tm_games (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      mode              TEXT    NOT NULL CHECK(mode IN ('solo', 'multiplayer')),
      status            TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'complete')),
      generation        INTEGER,
      solo_terraformed  INTEGER,
      created_by        INTEGER NOT NULL REFERENCES users(id),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      completed_at      TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tm_game_players (
      id                         INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id                    INTEGER NOT NULL REFERENCES tm_games(id) ON DELETE CASCADE,
      user_id                    INTEGER REFERENCES users(id),
      player_name                TEXT    NOT NULL,
      color                      TEXT    NOT NULL CHECK(color IN ('red', 'green', 'blue', 'yellow', 'black')),
      seat_order                 INTEGER NOT NULL,
      tr                         INTEGER DEFAULT 20,
      greeneries                 INTEGER DEFAULT 0,
      city_adjacent_greeneries   INTEGER DEFAULT 0,
      card_vps_expression        TEXT,
      card_vps                   INTEGER DEFAULT 0,
      milestone_vps              INTEGER DEFAULT 0,
      award_vps                  INTEGER DEFAULT 0,
      total_vps                  INTEGER DEFAULT 0,
      final_rank                 INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tm_game_milestones (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id              INTEGER NOT NULL REFERENCES tm_games(id) ON DELETE CASCADE,
      milestone_name       TEXT    NOT NULL,
      claimed_by_player_id INTEGER NOT NULL REFERENCES tm_game_players(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tm_game_awards (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id    INTEGER NOT NULL REFERENCES tm_games(id) ON DELETE CASCADE,
      award_name TEXT    NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tm_game_award_places (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      award_id  INTEGER NOT NULL REFERENCES tm_game_awards(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES tm_game_players(id),
      place     INTEGER NOT NULL CHECK(place IN (1, 2))
    )
  `)
}

module.exports = { name, up }
