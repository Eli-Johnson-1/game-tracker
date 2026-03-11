import { useState, useEffect, useMemo } from 'react'
import { getLeaderboard } from '../../api/terraformingMars'
import { LoadingSpinner } from '../common/LoadingSpinner'

const COLUMNS = [
  { key: 'games_played', label: 'Games', title: 'Games Played' },
  { key: 'wins',         label: 'Wins',  title: 'Wins' },
  { key: 'avg_vps',      label: 'Avg VP', title: 'Average VP' },
  { key: 'best_vps',     label: 'Best VP', title: 'Best VP Score' },
  { key: 'avg_tr',       label: 'Avg TR', title: 'Average TR' },
]

export function TmLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState({ col: 'wins', dir: 'desc' })

  useEffect(() => {
    getLeaderboard()
      .then(({ data }) => setLeaderboard(data.leaderboard))
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
    return [...leaderboard].sort((a, b) => (Number(b[sort.col]) - Number(a[sort.col])) * -dir)
  }, [leaderboard, sort])

  if (loading) return <div className="flex justify-center py-4"><LoadingSpinner /></div>
  if (leaderboard.length === 0) return null

  return (
    <div className="rounded-xl border overflow-hidden mb-6" style={{ backgroundColor: '#2d1000', borderColor: '#7c2d12' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: '#7c2d12' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>
          Leaderboard
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: '#f97316', borderBottom: '1px solid #7c2d12' }}>
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Player</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className="text-right px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap hover:text-white transition-colors"
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
              <tr key={row.id} className={i % 2 === 0 ? 'bg-black/10' : ''}>
                <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                <td className="px-4 py-2 text-white font-medium">{row.username}</td>
                <td className="px-3 py-2 text-right text-white">{row.games_played}</td>
                <td className="px-3 py-2 text-right text-white">{row.wins}</td>
                <td className="px-3 py-2 text-right text-gray-300">{row.avg_vps}</td>
                <td className="px-3 py-2 text-right text-gray-300">{row.best_vps}</td>
                <td className="px-3 py-2 text-right text-gray-300">{row.avg_tr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
