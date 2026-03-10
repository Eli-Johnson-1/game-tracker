const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { getSiteLeaderboard } = require('../controllers/leaderboardController')

const router = express.Router()

router.get('/', requireAuth, getSiteLeaderboard)

module.exports = router
