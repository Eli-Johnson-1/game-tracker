const express = require('express')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')
const { requireAuth } = require('../middleware/auth')
const { entraAuth, me } = require('../controllers/authController')

const router = express.Router()

router.post('/entra',
  body('idToken').notEmpty().withMessage('idToken is required'),
  validate,
  entraAuth
)

router.get('/me', requireAuth, me)

module.exports = router
