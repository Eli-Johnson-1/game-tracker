const name = '004_entra_auth'

function up(db) {
  db.exec(`ALTER TABLE users ADD COLUMN entra_oid TEXT`)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_entra_oid ON users (entra_oid) WHERE entra_oid IS NOT NULL`)

  db.prepare(`UPDATE users SET email = 'kylie@chuplab.com' WHERE LOWER(username) = 'kylie'`).run()
  db.prepare(`UPDATE users SET email = 'eli@chuplab.com' WHERE LOWER(username) = 'eli'`).run()
}

module.exports = { name, up }
