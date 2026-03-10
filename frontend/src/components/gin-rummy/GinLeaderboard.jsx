import { useState, useEffect, useMemo } from 'react'
import { getLeaderboard } from '../../api/ginRummy'
import { LoadingSpinner } from '../common/LoadingSpinner'

const COLUMNS = [
  { key: 'games_won',      label: 'W',         title: 'Games Won' },
  { key: 'games_lost',     label: 'L',         title: 'Games Lost' },
  { key: 'hands_won',      label: 'HW',        title: 'Hands Won' },
  { key: 'hands_lost',     label: 'HL',        title: 'Hands Lost' },
  { key: 'points_for',     label: 'Pts',       title: 'Points For' },
  { key: 'points_against', label: 'Pts Agst',  title: 'Points Against' },
  { key: 'shutouts',       label: 'SO',        title: 'Shutouts' },
]

export function GinLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState({ col: 'games_won', dir: 'desc' })

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
    return [...leaderboard].sort((a, b) => (b[sort.col] - a[sort.col]) * -dir)
  }, [leaderboard, sort])

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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: '#7ab893', borderBottom: '1px solid #2d5a40' }}>
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
                <td className="px-3 py-2 text-right text-white">{row.games_won}</td>
                <td className="px-3 py-2 text-right text-gray-400">{row.games_lost}</td>
                <td className="px-3 py-2 text-right text-gray-400">{row.hands_won}</td>
                <td className="px-3 py-2 text-right text-gray-400">{row.hands_lost}</td>
                <td className="px-3 py-2 text-right text-gray-400">{row.points_for}</td>
                <td className="px-3 py-2 text-right text-gray-400">{row.points_against}</td>
                <td className="px-3 py-2 text-right text-gray-400">{row.shutouts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
