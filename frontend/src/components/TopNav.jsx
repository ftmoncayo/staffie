import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import NotificationsLink from './NotificationsLink'

function buildPrimaryLinks() {
  return [
    { to: '/home', label: 'Home' },
    { to: '/profile', label: 'Profile' },
    { to: '/discover', label: 'People' },
    { to: '/venues', label: 'Venues' },
    { to: '/businesses', label: 'Businesses' },
    { to: '/jobs', label: 'Jobs' },
  ]
}

function buildMineLinks(user) {
  return [
    ...(user?.managesVenue ? [{ to: '/venues/mine', label: 'My Venues' }] : []),
    ...(user?.managesBusiness ? [{ to: '/businesses/mine', label: 'My Businesses' }] : []),
    ...(user?.managesVenue ? [{ to: '/jobs/mine', label: 'My Jobs' }] : []),
  ]
}

function buildAdminLinks(user, unverifiedVenueCount, unverifiedBusinessCount) {
  return [
    ...(user?.isAdmin || user?.isVenueAdmin
      ? [{ to: '/admin/venues', label: `Venue Admin${unverifiedVenueCount !== null ? ` (${unverifiedVenueCount})` : ''}` }]
      : []),
    ...(user?.isAdmin
      ? [
          {
            to: '/admin/businesses',
            label: `Business Admin${unverifiedBusinessCount !== null ? ` (${unverifiedBusinessCount})` : ''}`,
          },
        ]
      : []),
    ...(user?.isAdmin ? [{ to: '/admin/users', label: 'Users' }] : []),
    ...(user?.isAdmin ? [{ to: '/admin/jobs', label: 'Job Admin' }] : []),
    ...(user?.isAdmin ? [{ to: '/admin/lookups', label: 'Lookup Data' }] : []),
  ]
}

function TopNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unverifiedVenueCount, setUnverifiedVenueCount] = useState(null)
  const [unverifiedBusinessCount, setUnverifiedBusinessCount] = useState(null)
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
    if (user?.isAdmin || user?.isVenueAdmin) {
      api
        .fetchVenues({ status: 'UNVERIFIED', includeManaged: true })
        .then((venues) => setUnverifiedVenueCount(venues.length))
    } else {
      setUnverifiedVenueCount(null)
    }
    if (user?.isAdmin) {
      api
        .fetchBusinesses({ status: 'UNVERIFIED', includeManaged: true })
        .then((businesses) => setUnverifiedBusinessCount(businesses.length))
    } else {
      setUnverifiedBusinessCount(null)
    }
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
  const primaryLinks = buildPrimaryLinks()
  const mineLinks = buildMineLinks(user)
  const adminLinks = buildAdminLinks(user, unverifiedVenueCount, unverifiedBusinessCount)

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
          <NotificationsLink />
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
        {primaryLinks.map((link) => (
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
        {(mineLinks.length > 0 || adminLinks.length > 0) && (
          <>
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            {[...mineLinks, ...adminLinks].map((link) => (
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
            <span className="h-4 w-px bg-border" aria-hidden="true" />
          </>
        )}
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
          {primaryLinks.map((link) => (
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
          {(mineLinks.length > 0 || adminLinks.length > 0) && (
            <>
              <hr className="my-2 border-border" />
              {[...mineLinks, ...adminLinks].map((link) => (
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
              <hr className="my-2 border-border" />
            </>
          )}
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
