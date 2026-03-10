const { AppError } = require('../utils/errors')

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // express-validator result errors are handled in routes, but catch any that leak
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
}

module.exports = { errorHandler }
