import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/discover', label: 'People' },
  { to: '/venues', label: 'Venues' },
  { to: '/businesses', label: 'Businesses' },
  { to: '/jobs', label: 'Jobs' },
]

function TopNav() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    api
      .fetchProfile()
      .then((data) => setProfile(data.profile))
      .catch(() => {})
  }, [user])

  if (!user) return null

  const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : ''
  const displayName = name || user.email

  return (
    <div className="sticky top-0 z-10 bg-surface">
      <div className="border-b border-border px-4 py-2 text-sm text-text-muted">{displayName}</div>
      <nav className="flex items-center gap-6 overflow-x-auto border-b border-border px-4 py-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap text-sm font-medium ${
                isActive ? 'text-accent' : 'text-text-muted hover:text-accent'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default TopNav
