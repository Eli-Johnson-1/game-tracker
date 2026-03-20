const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/gametracker.db')

let db

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

function runMigrations() {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL UNIQUE,
      run_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrations = [
    require('./migrations/001_initial'),
    require('./migrations/002_settings'),
    require('./migrations/003_bonus_toggles'),
    require('./migrations/004_entra_auth'),
    require('./migrations/005_terraforming_mars'),
    require('./migrations/006_nullable_password_hash'),
    require('./migrations/007_venus_next'),
    require('./migrations/008_tm_imported'),
  ]

  for (const migration of migrations) {
    const already = db.prepare('SELECT id FROM migrations WHERE name = ?').get(migration.name)
    if (!already) {
      migration.up(db)
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name)
      console.log(`Migration applied: ${migration.name}`)
    }
  }
}

module.exports = { getDb, runMigrations }
