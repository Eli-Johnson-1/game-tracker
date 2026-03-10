import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-white font-bold text-lg tracking-wide">
          Game Tracker
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/gin-rummy"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            ♠ Gin Rummy
          </NavLink>
          <NavLink
            to="/terraforming-mars"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            TM
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            Settings
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm hidden sm:block">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
