const express = require('express')
const { body, param } = require('express-validator')
const { requireAuth } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const {
  listGames, createGame, getGame, deleteGame,
  submitHand, undoLastHand, getLeaderboard,
} = require('../controllers/ginRummyController')

const router = express.Router()

router.get('/leaderboard', requireAuth, getLeaderboard)

router.get('/games', requireAuth, listGames)

router.post('/games',
  requireAuth,
  body('opponent_id').isInt({ min: 1 }).withMessage('Valid opponent_id required'),
  validate,
  createGame
)

router.get('/games/:id', requireAuth, getGame)

router.delete('/games/:id',
  requireAuth,
  param('id').isInt({ min: 1 }),
  validate,
  deleteGame
)

router.post('/games/:id/hands',
  requireAuth,
  param('id').isInt({ min: 1 }),
  body('hand_type').isIn(['knock', 'gin', 'big_gin']).withMessage('hand_type must be knock, gin, or big_gin'),
  body('knocker_id').optional().isInt({ min: 1 }),
  body('knocker_deadwood').optional().isInt({ min: 0, max: 10 }),
  body('defender_deadwood').optional().isInt({ min: 0 }),
  validate,
  submitHand
)

router.delete('/games/:id/hands/:handId',
  requireAuth,
  param('id').isInt({ min: 1 }),
  param('handId').isInt({ min: 1 }),
  validate,
  undoLastHand
)

module.exports = router
