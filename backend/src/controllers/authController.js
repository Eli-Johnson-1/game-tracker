const bcrypt = require('bcryptjs')
const { getDb } = require('../db/database')
const { signToken } = require('../utils/jwt')
const { ValidationError } = require('../utils/errors')

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body
    const db = getDb()

    const existing = db.prepare(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR email = ?'
    ).get(username, email)

    if (existing) {
      return next(new ValidationError('Username or email already in use'))
    }

    const hash = await bcrypt.hash(password, 12)
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, hash)

    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid)

    const token = signToken({ id: user.id, username: user.username })
    res.status(201).json({ token, user })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body
    const db = getDb()

    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username)
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = signToken({ id: user.id, username: user.username })
    const { password_hash, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    next(err)
  }
}

function me(req, res, next) {
  try {
    const db = getDb()
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
      .get(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, me }
