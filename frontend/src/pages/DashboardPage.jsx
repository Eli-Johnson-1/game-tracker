import { useAuth } from '../hooks/useAuth'
import { SiteLeaderboard } from '../components/dashboard/SiteLeaderboard'
import { GameCard } from '../components/dashboard/GameCard'
import { usePageTitle } from '../hooks/usePageTitle'

export function DashboardPage() {
  usePageTitle('Dashboard')
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.username}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Family game score tracker</p>
      </div>

      <SiteLeaderboard />

      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GameCard
            to="/gin-rummy"
            icon="♠"
            title="Gin Rummy"
            description="2-player card game. Track hands, running totals, and end-game bonuses."
          />
          <GameCard
            to="/terraforming-mars"
            icon="🪐"
            title="Terraforming Mars"
            description="Solo and multiplayer strategy game. Track TR, greeneries, cities, milestones, awards, and card VPs."
          />
        </div>
      </div>
    </div>
  )
}
