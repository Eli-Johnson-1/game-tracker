import { usePageTitle } from '../hooks/usePageTitle'

export function SettingsPage() {
  usePageTitle('Settings')
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
      <p className="text-gray-400">
        No site-wide settings yet — game-specific settings live within each game.
      </p>
    </div>
  )
}
