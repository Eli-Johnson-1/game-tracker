import { Link } from 'react-router-dom'

export function GameCard({ to, icon, title, description, comingSoon = false }) {
  const content = (
    <div className={`
      rounded-xl border p-5 transition-all
      ${comingSoon
        ? 'opacity-60 border-gray-700 bg-gray-800/50 cursor-default'
        : 'border-gray-700 bg-gray-800 hover:border-emerald-600/60 hover:bg-gray-800/80 cursor-pointer'
      }
    `}>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
      {comingSoon && (
        <span className="inline-block mt-3 text-xs text-gray-500 border border-gray-700 rounded-full px-2 py-0.5">
          Coming soon
        </span>
      )}
    </div>
  )

  if (comingSoon) return content
  return <Link to={to}>{content}</Link>
}
