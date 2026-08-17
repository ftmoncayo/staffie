import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as api from '../lib/api'

function NotificationsLink() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    api
      .fetchUnreadNotificationCount()
      .then(setUnreadCount)
      .catch(() => {})
  }, [])

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        `text-sm font-medium ${isActive ? 'text-accent' : 'text-text-muted hover:text-accent'}`
      }
    >
      {unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
    </NavLink>
  )
}

export default NotificationsLink
