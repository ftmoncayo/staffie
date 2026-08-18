import { NavLink } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'

function NotificationsLink() {
  const { unreadCount } = useNotifications()

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
