const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { listUsers, getUser } = require('../controllers/usersController')

const router = express.Router()

router.get('/', requireAuth, listUsers)
router.get('/:id', requireAuth, getUser)

module.exports = router
