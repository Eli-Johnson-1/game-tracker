import { useState, useEffect } from 'react'
import { getLeaderboard } from '../../api/ginRummy'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function GinLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard()
      .then(({ data }) => setLeaderboard(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-4"><LoadingSpinner /></div>
  if (leaderboard.length === 0) return null

  return (
    <div className="rounded-xl border overflow-hidden mb-6"
      style={{ backgroundColor: '#162a1e', borderColor: '#2d5a40' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: '#2d5a40' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#7ab893' }}>
          Leaderboard
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: '#7ab893', borderBottom: '1px solid #2d5a40' }}>
            <th className="text-left px-4 py-2 font-medium">#</th>
            <th className="text-left px-4 py-2 font-medium">Player</th>
            <th className="text-right px-4 py-2 font-medium">W</th>
            <th className="text-right px-4 py-2 font-medium">GP</th>
            <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Shutouts</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-black/10' : ''}>
              <td className="px-4 py-2 text-gray-500">{i + 1}</td>
              <td className="px-4 py-2 text-white font-medium">{row.username}</td>
              <td className="px-4 py-2 text-right text-white">{row.games_won}</td>
              <td className="px-4 py-2 text-right text-gray-400">{row.games_played}</td>
              <td className="px-4 py-2 text-right text-gray-400 hidden sm:table-cell">{row.shutouts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
