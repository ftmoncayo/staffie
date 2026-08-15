import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import ActivityItem from '../components/ActivityItem'
import PersonCard from '../components/PersonCard'
import ConnectionButton from '../components/ConnectionButton'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchFeed()
      .then((data) => {
        setActivities(data.activities)
        setSuggestions(data.suggestions)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function updateSuggestion(userId, changes) {
    setSuggestions((prev) => prev.map((p) => (p.id === userId ? { ...p, ...changes } : p)))
  }

  async function handleConnect(person) {
    const request = await api.requestConnection(person.id)
    updateSuggestion(person.id, {
      connectionStatus: request.status === 'PENDING' ? 'pending-sent' : person.connectionStatus,
    })
  }

  async function handleAccept(person) {
    await api.acceptConnectionRequest(person.connectionRequestId)
    updateSuggestion(person.id, { connectionStatus: 'connected' })
  }

  async function handleDecline(person) {
    await api.declineConnectionRequest(person.connectionRequestId)
    updateSuggestion(person.id, { connectionStatus: 'none', connectionRequestId: null })
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">Home</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/connections/requests" className="text-accent hover:text-accent-hover hover:underline">
              Connection requests
            </Link>
            {user?.isAdmin && (
              <Link to="/admin/venues" className="text-accent hover:text-accent-hover hover:underline">
                Admin
              </Link>
            )}
            {user?.isAdmin && (
              <Link to="/admin/businesses" className="text-accent hover:text-accent-hover hover:underline">
                Unverified businesses
              </Link>
            )}
            {user?.isAdmin && (
              <Link to="/admin/users" className="text-accent hover:text-accent-hover hover:underline">
                Users
              </Link>
            )}
            <button type="button" onClick={handleLogout} className="text-text-muted hover:text-danger">
              Logout
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {suggestions.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold text-text">People you might know</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {suggestions.map((person) => (
                <PersonCard key={person.id} person={person}>
                  <ConnectionButton
                    status={person.connectionStatus}
                    onConnect={() => handleConnect(person)}
                    onAccept={() => handleAccept(person)}
                    onDecline={() => handleDecline(person)}
                  />
                </PersonCard>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text">Activity</h2>
          {!loading && activities.length === 0 && (
            <p className="text-sm text-text-faint">
              No activity yet. Connect with people and follow venues or businesses to see updates here.
            </p>
          )}
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
