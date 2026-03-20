const name = '010_unknown_color'

function up(db) {
  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE tm_game_players_new (
      id                         INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id                    INTEGER NOT NULL REFERENCES tm_games(id) ON DELETE CASCADE,
      user_id                    INTEGER REFERENCES users(id),
      player_name                TEXT    NOT NULL,
      color                      TEXT    NOT NULL CHECK(color IN ('red', 'green', 'blue', 'yellow', 'black', 'unknown')),
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
    );

    INSERT INTO tm_game_players_new SELECT * FROM tm_game_players;

    DROP TABLE tm_game_players;

    ALTER TABLE tm_game_players_new RENAME TO tm_game_players;

    PRAGMA foreign_keys = ON;
  `)
}

module.exports = { name, up }
