const express = require('express')
const { body, param } = require('express-validator')
const multer = require('multer')
const { requireAuth } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const {
  listGames,
  createGame,
  getGame,
  deleteGame,
  completeGame,
  editGame,
  getLeaderboard,
  analyzePhoto,
} = require('../controllers/terraformingMarsController')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are accepted'))
    }
  },
})

const VALID_COLORS = ['red', 'green', 'blue', 'yellow', 'black']

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/leaderboard', requireAuth, getLeaderboard)

router.get('/games', requireAuth, listGames)

router.post('/games',
  requireAuth,
  body('mode').isIn(['solo', 'multiplayer']).withMessage('mode must be solo or multiplayer'),
  body('players').isArray({ min: 1, max: 5 }).withMessage('players must be an array of 1–5 items'),
  body('players.*.player_name').trim().isLength({ min: 1, max: 50 }).withMessage('player_name is required (max 50 chars)'),
  body('players.*.color').isIn(VALID_COLORS).withMessage(`color must be one of: ${VALID_COLORS.join(', ')}`),
  body('players.*.user_id').optional({ nullable: true }).isInt({ min: 1 }),
  validate,
  createGame
)

router.get('/games/:id',
  requireAuth,
  param('id').isInt({ min: 1 }),
  validate,
  getGame
)

router.post('/games/:id/complete',
  requireAuth,
  param('id').isInt({ min: 1 }),
  body('generation').isInt({ min: 1, max: 30 }).withMessage('generation must be 1–30'),
  body('players').isArray({ min: 1, max: 5 }).withMessage('players must be an array'),
  body('players.*.player_id').isInt({ min: 1 }).withMessage('player_id required'),
  body('players.*.tr').isInt({ min: 0, max: 100 }).withMessage('tr must be 0–100'),
  body('players.*.greeneries').isInt({ min: 0 }).withMessage('greeneries must be ≥ 0'),
  body('players.*.city_adjacent_greeneries').isInt({ min: 0 }).withMessage('city_adjacent_greeneries must be ≥ 0'),
  body('milestones').optional().isArray({ max: 3 }).withMessage('max 3 milestones'),
  body('milestones.*.milestone_name').optional().isString(),
  body('milestones.*.player_id').optional().isInt({ min: 1 }),
  body('awards').optional().isArray({ max: 3 }).withMessage('max 3 awards'),
  body('awards.*.award_name').optional().isString(),
  body('awards.*.places').optional().isArray(),
  body('awards.*.places.*.player_id').optional().isInt({ min: 1 }),
  body('awards.*.places.*.place').optional().isIn([1, 2]).withMessage('place must be 1 or 2'),
  validate,
  completeGame
)

router.put('/games/:id',
  requireAuth,
  param('id').isInt({ min: 1 }),
  body('generation').isInt({ min: 1, max: 30 }).withMessage('generation must be 1–30'),
  body('players').isArray({ min: 1, max: 5 }).withMessage('players must be an array'),
  body('players.*.player_id').isInt({ min: 1 }).withMessage('player_id required'),
  body('players.*.tr').isInt({ min: 0, max: 100 }).withMessage('tr must be 0–100'),
  body('players.*.greeneries').isInt({ min: 0 }).withMessage('greeneries must be ≥ 0'),
  body('players.*.city_adjacent_greeneries').isInt({ min: 0 }).withMessage('city_adjacent_greeneries must be ≥ 0'),
  body('milestones').optional().isArray({ max: 3 }).withMessage('max 3 milestones'),
  body('milestones.*.milestone_name').optional().isString(),
  body('milestones.*.player_id').optional().isInt({ min: 1 }),
  body('awards').optional().isArray({ max: 3 }).withMessage('max 3 awards'),
  body('awards.*.award_name').optional().isString(),
  body('awards.*.places').optional().isArray(),
  body('awards.*.places.*.player_id').optional().isInt({ min: 1 }),
  body('awards.*.places.*.place').optional().isIn([1, 2]).withMessage('place must be 1 or 2'),
  validate,
  editGame
)

router.delete('/games/:id',
  requireAuth,
  param('id').isInt({ min: 1 }),
  validate,
  deleteGame
)

router.post('/analyze-photo',
  requireAuth,
  upload.single('image'),
  analyzePhoto
)

module.exports = router
