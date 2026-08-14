import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
      <p className="text-lg text-gray-600">Logged in as {user?.email}</p>
      <button
        onClick={handleLogout}
        className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
      >
        Logout
      </button>
    </div>
  )
}

export default Dashboard
