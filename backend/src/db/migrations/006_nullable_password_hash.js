const name = '006_nullable_password_hash'

function up(db) {
  // SQLite does not support ALTER COLUMN, so recreate the users table
  // with password_hash nullable to support Entra-only accounts.
  db.pragma('foreign_keys = OFF')
  db.exec(`
    CREATE TABLE users_new (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT,
      entra_oid     TEXT    UNIQUE,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users_new SELECT id, username, email, password_hash, entra_oid, created_at, updated_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `)
  db.pragma('foreign_keys = ON')
}

module.exports = { name, up }
