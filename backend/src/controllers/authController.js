const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')
const { getDb } = require('../db/database')
const { signToken } = require('../utils/jwt')

const TENANT_ID = process.env.ENTRA_TENANT_ID
const CLIENT_ID = process.env.ENTRA_CLIENT_ID

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
})

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    callback(null, key.getPublicKey())
  })
}

async function entraAuth(req, res, next) {
  try {
    const { idToken } = req.body
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' })
    }

    // Verify the Microsoft-issued ID token
    const claims = await new Promise((resolve, reject) => {
      jwt.verify(
        idToken,
        getSigningKey,
        {
          audience: CLIENT_ID,
          issuer: [
            `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
            `https://sts.windows.net/${TENANT_ID}/`,
          ],
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) reject(err)
          else resolve(decoded)
        }
      )
    })

    const oid = claims.oid
    const email = (claims.preferred_username || claims.email || '').toLowerCase()
    const name = claims.name || email.split('@')[0]

    const db = getDb()

    // 1. Find by entra_oid
    let user = db.prepare('SELECT id, username, email FROM users WHERE entra_oid = ?').get(oid)

    if (!user && email) {
      // 2. Find by email — link existing account (Kylie/Eli migration path)
      user = db.prepare('SELECT id, username, email FROM users WHERE LOWER(email) = ?').get(email)
      if (user) {
        db.prepare('UPDATE users SET entra_oid = ? WHERE id = ?').run(oid, user.id)
      }
    }

    if (!user) {
      // 3. Auto-provision new user
      const result = db.prepare(
        'INSERT INTO users (username, email, entra_oid) VALUES (?, ?, ?)'
      ).run(name, email, oid)
      user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(result.lastInsertRowid)
    }

    const token = signToken({ id: user.id, username: user.username })
    res.json({ token, user })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired Microsoft token' })
    }
    next(err)
  }
}

function me(req, res, next) {
  try {
    const db = getDb()
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
      .get(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const isAdmin = process.env.ADMIN_USERNAME
      ? user.username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()
      : false
    res.json({ user: { ...user, is_admin: isAdmin } })
  } catch (err) {
    next(err)
  }
}

module.exports = { entraAuth, me }
