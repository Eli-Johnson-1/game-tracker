const { verifyToken } = require('../utils/jwt')
const { UnauthorizedError } = require('../utils/errors')

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'))
  }

  const token = header.slice(7)
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    next(new UnauthorizedError('Invalid or expired token'))
  }
}

module.exports = { requireAuth }
