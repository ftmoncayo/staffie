import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../lib/api'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function notificationText(n) {
  const name = n.sourceUser?.name || 'Someone'
  switch (n.type) {
    case 'CONNECTION_REQUEST':
      return `${name} sent you a connection request`
    case 'CONNECTION_ACCEPTED':
      return `${name} accepted your connection request`
    case 'COMMENT':
      return `${name} commented on your ${n.targetType === 'ACTIVITY' ? 'activity' : 'post'}`
    case 'NOD':
      return `${name} nodded your ${n.targetType === 'ACTIVITY' ? 'activity' : 'post'}`
    default:
      return 'New notification'
  }
}

function notificationLink(n) {
  if (n.type === 'CONNECTION_REQUEST') return '/connections/requests'
  if (n.type === 'CONNECTION_ACCEPTED') return n.sourceUser ? `/profile/${n.sourceUser.id}` : '/connections'
  // Comments/nods target either a Post or an Activity, neither of which has
  // its own page — Dashboard is where Posts render, and a person's own
  // Activity always shows on their own Profile regardless of feed reach.
  return n.targetType === 'ACTIVITY' ? '/profile' : '/dashboard'
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .fetchUnreadNotificationCount()
      .then(setUnreadCount)
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function refreshList() {
    setLoading(true)
    setError('')
    return api
      .fetchNotifications()
      .then(setNotifications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) refreshList()
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleNotificationClick(notification) {
    setOpen(false)
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      api.markNotificationRead(notification.id).catch(() => {})
    }
    navigate(notificationLink(notification))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className="text-sm font-medium text-text-muted hover:text-accent"
      >
        {unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-surface shadow-lg shadow-black/40">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-medium text-text">Notifications</span>
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-accent hover:text-accent-hover hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {error && <p className="p-4 text-xs text-danger">{error}</p>}
            {!loading && !error && notifications.length === 0 && (
              <p className="p-4 text-sm text-text-faint">No notifications yet.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-hover ${
                  n.read ? '' : 'bg-bg'
                }`}
              >
                <span className="text-sm text-text">{notificationText(n)}</span>
                <span className="text-xs text-text-faint">{formatDate(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
