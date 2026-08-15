import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function personName(profile) {
  if (!profile) return null
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function ConnectionRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [respondingId, setRespondingId] = useState('')

  useEffect(() => {
    api
      .fetchConnectionRequests()
      .then(setRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleAccept(id) {
    setError('')
    setRespondingId(id)
    try {
      await api.acceptConnectionRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId('')
    }
  }

  async function handleDecline(id) {
    setError('')
    setRespondingId(id)
    try {
      await api.declineConnectionRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId('')
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Connection requests</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {!loading && requests.length === 0 && (
          <p className="text-sm text-text-faint">No pending connection requests.</p>
        )}

        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <Link
                  to={`/profile/${request.fromUser.id}`}
                  className="font-medium text-text hover:text-accent hover:underline"
                >
                  {personName(request.fromUser.profile) || request.fromUser.email}
                </Link>
                {request.fromUser.profile?.professionalTitle && (
                  <p className="text-sm text-text-muted">{request.fromUser.profile.professionalTitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={respondingId === request.id}
                  onClick={() => handleAccept(request.id)}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={respondingId === request.id}
                  onClick={() => handleDecline(request.id)}
                  className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConnectionRequests
