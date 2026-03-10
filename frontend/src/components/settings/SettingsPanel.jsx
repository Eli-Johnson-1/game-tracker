import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { updateSettings } from '../../api/settings'
import { Button } from '../common/Button'
import { ErrorMessage } from '../common/ErrorMessage'

// Numeric-only settings (no inline toggle)
const NUMERIC_FIELDS = [
  {
    key: 'gin_rummy_win_threshold',
    label: 'Win Threshold',
    description: 'Running score that triggers end-game scoring',
    unit: 'pts',
  },
  {
    key: 'gin_bonus',
    label: 'Gin Bonus',
    description: 'Points awarded when a player goes Gin',
    unit: 'pts',
  },
  {
    key: 'big_gin_bonus',
    label: 'Big Gin Bonus',
    description: 'Points awarded when a player goes Big Gin (all 11 cards melded)',
    unit: 'pts',
  },
  {
    key: 'undercut_bonus',
    label: 'Undercut Bonus',
    description: 'Bonus added to the deadwood difference when defender undercuts',
    unit: 'pts',
  },
]

// End-game bonus fields — each has an inline enabled toggle
const BONUS_FIELDS = [
  {
    key: 'game_bonus',
    enabledKey: 'game_bonus_enabled',
    label: 'Game Bonus',
    description: 'Points awarded to the winner at end-game',
    unit: 'pts',
  },
  {
    key: 'line_bonus',
    enabledKey: 'line_bonus_enabled',
    label: 'Line / Box Bonus',
    description: 'Points per hand won, awarded to each player at end-game',
    unit: 'pts per hand',
  },
  {
    key: 'shutout_extra_game_bonus',
    enabledKey: 'shutout_enabled',
    label: 'Shutout Bonus',
    description: 'Extra points to winner if the loser won zero hands',
    unit: 'pts',
  },
]

function Toggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-emerald-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function SettingsPanel() {
  const { settings, refetch } = useSettings()
  const [form, setForm] = useState({})
  const [toggles, setToggles] = useState({
    game_bonus_enabled: true,
    line_bonus_enabled: true,
    shutout_enabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return
    const initial = {}
    for (const { key } of [...NUMERIC_FIELDS, ...BONUS_FIELDS]) {
      initial[key] = settings[key] ?? ''
    }
    setForm(initial)
    setToggles({
      game_bonus_enabled: settings.game_bonus_enabled ?? true,
      line_bonus_enabled: settings.line_bonus_enabled ?? true,
      shutout_enabled:    settings.shutout_enabled    ?? true,
    })
  }, [settings])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleToggle(key) {
    setToggles(t => ({ ...t, [key]: !t[key] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      const payload = { ...form, ...toggles }
      await updateSettings(payload)
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Gin Rummy Scoring</h2>
        <p className="text-sm text-gray-400">
          Changes apply to all games immediately, including completed games.
        </p>
      </div>

      <ErrorMessage message={error} />

      <div className="space-y-4">
        {NUMERIC_FIELDS.map(({ key, label, description, unit }) => (
          <div key={key} className="flex items-start gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-200 mb-0.5">{label}</label>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                name={key}
                value={form[key] ?? ''}
                onChange={handleChange}
                min={0}
                max={500}
                required
                className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-gray-500 w-16">{unit}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-700 pt-4">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">End-game bonuses</p>
          <div className="space-y-4">
            {BONUS_FIELDS.map(({ key, enabledKey, label, description, unit }) => (
              <div key={key} className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-200 mb-0.5">{label}</label>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    name={key}
                    value={form[key] ?? ''}
                    onChange={handleChange}
                    min={0}
                    max={500}
                    required
                    disabled={!toggles[enabledKey]}
                    className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                  />
                  <span className="text-xs text-gray-500 w-16">{unit}</span>
                  <Toggle
                    enabled={toggles[enabledKey]}
                    onToggle={() => handleToggle(enabledKey)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
        {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
      </div>
    </form>
  )
}
