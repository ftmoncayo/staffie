import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <h1 className="text-3xl font-semibold text-text">Dashboard</h1>
      <p className="text-lg text-text-muted">Logged in as {user?.email}</p>
      <Link to="/profile" className="text-accent hover:text-accent-hover hover:underline">
        View / edit your profile
      </Link>
      <Link to="/venues" className="text-accent hover:text-accent-hover hover:underline">
        Venues
      </Link>
      <Link to="/discover" className="text-accent hover:text-accent-hover hover:underline">
        Discover people
      </Link>
      <Link to="/connections/requests" className="text-accent hover:text-accent-hover hover:underline">
        Connection requests
      </Link>
      {user?.isAdmin && (
        <Link to="/admin/venues" className="text-accent hover:text-accent-hover hover:underline">
          Admin
        </Link>
      )}
      {user?.isAdmin && (
        <Link to="/admin/users" className="text-accent hover:text-accent-hover hover:underline">
          Users
        </Link>
      )}
      <button
        onClick={handleLogout}
        className="rounded border border-border-strong bg-surface px-4 py-2 text-text hover:bg-surface-hover"
      >
        Logout
      </button>
    </div>
  )
}

export default Dashboard
