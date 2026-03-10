const name = '001_initial'

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gin_rummy_games (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id          INTEGER NOT NULL REFERENCES users(id),
      player2_id          INTEGER NOT NULL REFERENCES users(id),
      winner_id           INTEGER REFERENCES users(id),
      player1_final_score INTEGER,
      player2_final_score INTEGER,
      status              TEXT NOT NULL DEFAULT 'active',
      is_shutout          INTEGER NOT NULL DEFAULT 0,
      started_at          TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at        TEXT,
      imported            INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gin_rummy_hands (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id               INTEGER NOT NULL REFERENCES gin_rummy_games(id) ON DELETE CASCADE,
      hand_number           INTEGER NOT NULL,
      hand_type             TEXT NOT NULL,
      knocker_id            INTEGER REFERENCES users(id),
      winner_id             INTEGER NOT NULL REFERENCES users(id),
      knocker_deadwood      INTEGER,
      defender_deadwood     INTEGER,
      points_scored         INTEGER NOT NULL,
      player1_running_total INTEGER NOT NULL,
      player2_running_total INTEGER NOT NULL,
      played_at             TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

module.exports = { name, up }
