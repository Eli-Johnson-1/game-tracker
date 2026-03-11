import { useState, useEffect, useMemo } from 'react'
import { getSiteLeaderboard } from '../../api/leaderboard'
import { LoadingSpinner } from '../common/LoadingSpinner'

const MEDALS = ['🥇', '🥈', '🥉']

const COLUMNS = [
  { key: 'games_won',  label: 'Wins',     title: 'Total Wins (all games)' },
  { key: 'gr_wins',   label: 'GR Wins',  title: 'Gin Rummy Wins' },
  { key: 'tm_wins',   label: 'TM Wins',  title: 'Terraforming Mars Wins' },
  { key: 'games_played', label: 'Played', title: 'Total Games Played' },
]

export function SiteLeaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState({ col: 'games_won', dir: 'desc' })

  useEffect(() => {
    getSiteLeaderboard()
      .then(({ data }) => setRows(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSort(col) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    )
  }

  const sorted = useMemo(() => {
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => (b[sort.col] - a[sort.col]) * -dir)
  }, [rows, sort])

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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left px-4 py-2 font-medium">Player</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className="text-right px-4 py-2 font-medium cursor-pointer select-none whitespace-nowrap hover:text-gray-300 transition-colors"
                  title={col.title}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sort.col === col.key && (
                    <span className="ml-1">{sort.dir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.row_key} className={`border-b border-gray-700/50 ${i === 0 ? 'bg-yellow-900/10' : ''}`}>
                <td className="px-4 py-2.5">
                  <span className="mr-2">{MEDALS[i] || `${i + 1}.`}</span>
                  <span className="text-white font-medium">{row.player_name}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-white font-semibold">{row.games_won}</td>
                <td className="px-4 py-2.5 text-right text-gray-400">{row.gr_wins}</td>
                <td className="px-4 py-2.5 text-right text-gray-400">{row.tm_wins}</td>
                <td className="px-4 py-2.5 text-right text-gray-400">{row.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
