const { getDb } = require('../db/database')

function listUsers(req, res, next) {
  try {
    const db = getDb()
    const users = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY username').all()
    res.json({ users })
  } catch (err) {
    next(err)
  }
}

function getUser(req, res, next) {
  try {
    const db = getDb()
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
      .get(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

module.exports = { listUsers, getUser }
