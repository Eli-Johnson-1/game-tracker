const { getDb } = require('../db/database')

function getSettings(req, res, next) {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT key, value, description FROM settings ORDER BY key').all()
    const settings = Object.fromEntries(rows.map(r => [r.key, { value: r.value, description: r.description }]))
    res.json({ settings })
  } catch (err) {
    next(err)
  }
}

function updateSettings(req, res, next) {
  try {
    const db = getDb()
    const updates = req.body

    const update = db.prepare(`
      UPDATE settings SET value = @value, updated_at = datetime('now')
      WHERE key = @key
    `)

    const updateMany = db.transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        update.run({ key, value: String(value) })
      }
    })

    updateMany(updates)

    const rows = db.prepare('SELECT key, value, description FROM settings ORDER BY key').all()
    const settings = Object.fromEntries(rows.map(r => [r.key, { value: r.value, description: r.description }]))
    res.json({ settings })
  } catch (err) {
    next(err)
  }
}

function getSettingsMap(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const map = {}
  for (const { key, value } of rows) {
    if (value === 'true') map[key] = true
    else if (value === 'false') map[key] = false
    else if (!isNaN(value)) map[key] = Number(value)
    else map[key] = value
  }
  return map
}

module.exports = { getSettings, updateSettings, getSettingsMap }
