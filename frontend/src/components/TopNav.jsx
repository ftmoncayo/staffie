import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/discover', label: 'People' },
  { to: '/venues', label: 'Venues' },
]

function TopNav() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <nav className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-surface px-4 py-3">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `text-sm font-medium ${isActive ? 'text-accent' : 'text-text-muted hover:text-accent'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default TopNav
