require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { runMigrations } = require('./db/database')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/users',       require('./routes/users'))
app.use('/api/settings',    require('./routes/settings'))
app.use('/api/leaderboard', require('./routes/leaderboard'))
app.use('/api/gin-rummy',    require('./routes/ginRummy'))
// Import routes registered in Phase 8

app.use(errorHandler)

runMigrations()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
