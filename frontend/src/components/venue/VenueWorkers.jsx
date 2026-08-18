import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import ConnectionButton from '../ConnectionButton'

function personName(profile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function WorkerCard({ worker, showEndDate, currentUserId, onChange }) {
  function updateStatus(changes) {
    onChange({ ...worker, ...changes })
  }

  async function handleConnect() {
    const request = await api.requestConnection(worker.id)
    updateStatus({ connectionStatus: request.status === 'PENDING' ? 'pending-sent' : worker.connectionStatus })
  }

  async function handleAccept() {
    await api.acceptConnectionRequest(worker.connectionRequestId)
    updateStatus({ connectionStatus: 'connected' })
  }

  async function handleDecline() {
    await api.declineConnectionRequest(worker.connectionRequestId)
    updateStatus({ connectionStatus: 'none', connectionRequestId: null })
  }

  return (
    <div className="rounded border border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/profile/${worker.id}`}
            className="text-sm font-medium text-success hover:text-success-hover hover:underline"
          >
            {personName(worker.profile) || worker.email}
          </Link>
          <p className="text-sm text-text-faint">
            {worker.roleTitle}
            {showEndDate && worker.endDate ? ` · until ${formatDate(worker.endDate)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {worker.id !== currentUserId && (
            <ConnectionButton
              status={worker.connectionStatus}
              onConnect={handleConnect}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function VenueWorkers({ venueId }) {
  const { user } = useAuth()
  const [current, setCurrent] = useState([])
  const [previous, setPrevious] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchVenueWorkers(venueId)
      .then((data) => {
        setCurrent(data.current)
        setPrevious(data.previous)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [venueId])

  function handleCurrentChange(updated) {
    setCurrent((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
  }

  function handlePreviousChange(updated) {
    setPrevious((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Staff</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium text-text-faint">Current</h3>
          <div className="mt-2 flex flex-col gap-2">
            {!loading && current.length === 0 && (
              <p className="text-sm text-text-faint">No one currently works here.</p>
            )}
            {current.map((w) => (
              <WorkerCard
                key={w.id}
                worker={w}
                currentUserId={user?.id}
                onChange={handleCurrentChange}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-faint">Previous</h3>
          <div className="mt-2 flex flex-col gap-2">
            {!loading && previous.length === 0 && (
              <p className="text-sm text-text-faint">No previous workers logged yet.</p>
            )}
            {previous.map((w) => (
              <WorkerCard
                key={w.id}
                worker={w}
                showEndDate
                currentUserId={user?.id}
                onChange={handlePreviousChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VenueWorkers
