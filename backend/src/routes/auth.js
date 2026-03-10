const express = require('express')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')
const { requireAuth } = require('../middleware/auth')
const { register, login, me } = require('../controllers/authController')

const router = express.Router()

router.post('/register',
  body('username').trim().isLength({ min: 2, max: 30 }).withMessage('Username must be 2–30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  register
)

router.post('/login',
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
  login
)

router.get('/me', requireAuth, me)

module.exports = router
