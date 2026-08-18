import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import { useNotifications } from '../context/NotificationsContext'

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
    case 'ENDORSEMENT_REQUEST': {
      const label = n.targetType === 'SKILL' ? 'skill' : 'knowledge area'
      return `${name} asked you to endorse their ${label} "${n.itemName || ''}"`
    }
    case 'EVENT_INTEREST':
      return `${name} is interested in "${n.eventTitle || ''}"${n.eventInterestNote ? `: ${n.eventInterestNote}` : ''}`
    case 'ATTENDANCE_CONFIRM':
      return `Did you attend "${n.eventTitle || ''}"?`
    default:
      return 'New notification'
  }
}

function notificationLink(n) {
  if (n.type === 'CONNECTION_REQUEST') return '/connections/requests'
  if (n.type === 'CONNECTION_ACCEPTED') return n.sourceUser ? `/profile/${n.sourceUser.id}` : '/connections'
  if (n.type === 'ENDORSEMENT_REQUEST') return n.sourceUser ? `/profile/${n.sourceUser.id}` : '/discover'
  if (n.type === 'EVENT_INTEREST' || n.type === 'ATTENDANCE_CONFIRM') return `/events/${n.targetId}`
  // Comments/nods target either a Post or an Activity, neither of which has
  // its own page — Home is where Posts render, and a person's own Activity
  // always shows on their own Profile regardless of feed reach.
  return n.targetType === 'ACTIVITY' ? '/profile' : '/home'
}

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [respondingId, setRespondingId] = useState('')
  const [dismissingId, setDismissingId] = useState('')
  const [dismissingAll, setDismissingAll] = useState(false)
  const navigate = useNavigate()
  const { refreshUnreadCount } = useNotifications()

  function refresh() {
    setLoading(true)
    setError('')
    return api
      .fetchNotifications()
      .then(setNotifications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  function removeNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    refreshUnreadCount()
  }

  function handleClick(n) {
    if (!n.read) {
      api.markNotificationRead(n.id).then(refreshUnreadCount).catch(() => {})
    }
    navigate(notificationLink(n))
  }

  async function handleAccept(n) {
    setError('')
    setRespondingId(n.id)
    try {
      await api.acceptConnectionRequest(n.targetId)
      removeNotification(n.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId('')
    }
  }

  async function handleDecline(n) {
    setError('')
    setRespondingId(n.id)
    try {
      await api.declineConnectionRequest(n.targetId)
      removeNotification(n.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId('')
    }
  }

  async function handleEndorse(n) {
    setError('')
    setRespondingId(n.id)
    try {
      await api.endorseNotification(n.id)
      removeNotification(n.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId('')
    }
  }

  async function handleConfirmAttendance(n, attended) {
    setError('')
    setRespondingId(n.id)
    try {
      await api.confirmEventAttendance(n.targetId, attended)
      removeNotification(n.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId('')
    }
  }

  async function handleDismiss(n) {
    setError('')
    setDismissingId(n.id)
    try {
      await api.dismissNotification(n.id)
      removeNotification(n.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setDismissingId('')
    }
  }

  async function handleDismissAll() {
    setError('')
    setDismissingAll(true)
    try {
      await api.dismissAllNotifications()
      await refresh()
      refreshUnreadCount()
    } catch (err) {
      setError(err.message)
    } finally {
      setDismissingAll(false)
    }
  }

  const canDismissAll = notifications.some((n) => n.type !== 'CONNECTION_REQUEST' && n.type !== 'ATTENDANCE_CONFIRM')

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Notifications</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={dismissingAll || !canDismissAll}
              onClick={handleDismissAll}
              className="text-sm text-accent hover:text-accent-hover hover:underline disabled:cursor-not-allowed disabled:text-text-faint disabled:no-underline"
            >
              {dismissingAll ? 'Dismissing...' : 'Dismiss all'}
            </button>
            <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
              Back to home
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {!loading && notifications.length === 0 && (
          <p className="text-sm text-text-faint">No notifications yet.</p>
        )}

        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center justify-between gap-4 rounded-lg border bg-surface p-4 ${
                n.read ? 'border-border' : 'border-accent'
              }`}
            >
              <button type="button" onClick={() => handleClick(n)} className="flex-1 text-left">
                <span className="block text-sm text-text">{notificationText(n)}</span>
                <span className="block text-xs text-text-faint">{formatDate(n.createdAt)}</span>
              </button>

              {n.type === 'CONNECTION_REQUEST' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={respondingId === n.id}
                    onClick={() => handleAccept(n)}
                    className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === n.id}
                    onClick={() => handleDecline(n)}
                    className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              ) : n.type === 'ENDORSEMENT_REQUEST' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={respondingId === n.id}
                    onClick={() => handleEndorse(n)}
                    className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                  >
                    Endorse
                  </button>
                  <button
                    type="button"
                    disabled={dismissingId === n.id}
                    onClick={() => handleDismiss(n)}
                    className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              ) : n.type === 'ATTENDANCE_CONFIRM' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={respondingId === n.id}
                    onClick={() => handleConfirmAttendance(n, true)}
                    className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === n.id}
                    onClick={() => handleConfirmAttendance(n, false)}
                    className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={dismissingId === n.id}
                  onClick={() => handleDismiss(n)}
                  className="shrink-0 text-sm text-text-muted hover:text-danger disabled:opacity-50"
                >
                  Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Notifications
