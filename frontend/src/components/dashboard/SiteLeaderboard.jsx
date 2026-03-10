import { useState, useEffect } from 'react'
import { getSiteLeaderboard } from '../../api/leaderboard'
import { LoadingSpinner } from '../common/LoadingSpinner'

const MEDALS = ['🥇', '🥈', '🥉']

export function SiteLeaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSiteLeaderboard()
      .then(({ data }) => setRows(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-6"><LoadingSpinner /></div>
  if (rows.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">No games played yet. Start one!</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          All-Time Leaderboard
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700">
            <th className="text-left px-4 py-2 font-medium">Player</th>
            <th className="text-right px-4 py-2 font-medium">Wins</th>
            <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={`border-b border-gray-700/50 ${i === 0 ? 'bg-yellow-900/10' : ''}`}>
              <td className="px-4 py-2.5">
                <span className="mr-2">{MEDALS[i] || `${i + 1}.`}</span>
                <span className="text-white font-medium">{row.username}</span>
              </td>
              <td className="px-4 py-2.5 text-right text-white font-semibold">{row.games_won}</td>
              <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell">{row.games_played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
