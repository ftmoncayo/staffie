import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import NotificationBell from './NotificationBell'

function buildLinks(user) {
  return [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/profile', label: 'Profile' },
    { to: '/discover', label: 'People' },
    { to: '/connections/requests', label: 'Connection Requests' },
    { to: '/venues', label: 'Venues' },
    ...(user?.managesVenue ? [{ to: '/venues/mine', label: 'My Venues' }] : []),
    { to: '/businesses', label: 'Businesses' },
    ...(user?.managesBusiness ? [{ to: '/businesses/mine', label: 'My Businesses' }] : []),
    { to: '/jobs', label: 'Jobs' },
    ...(user?.managesVenue ? [{ to: '/jobs/mine', label: 'My Jobs' }] : []),
  ]
}

function TopNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const toggleButtonRef = useRef(null)

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

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : ''
  const displayName = name || user.email
  const links = buildLinks(user)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div className="sticky top-0 z-10 bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm text-text-muted">
        <span>{displayName}</span>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <button
            ref={toggleButtonRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="text-xl leading-none text-text-muted hover:text-accent sm:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <nav className="hidden items-center gap-6 border-b border-border px-4 py-3 sm:flex">
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
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium text-text-muted hover:text-danger"
        >
          Logout
        </button>
      </nav>

      {menuOpen && (
        <nav ref={menuRef} className="flex flex-col border-b border-border px-4 py-2 sm:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `rounded px-2 py-2 text-sm font-medium ${
                  isActive ? 'text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-accent'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded px-2 py-2 text-left text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-danger"
          >
            Logout
          </button>
        </nav>
      )}
    </div>
  )
}

export default TopNav
