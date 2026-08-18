import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'

function personName(profile) {
  if (!profile) return null
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function ConnectionsList() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    api
      .fetchConnections()
      .then(setConnections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleRemove(userId) {
    setError('')
    setRemovingId(userId)
    try {
      await api.removeConnection(userId)
      setConnections((prev) => prev.filter((c) => c.id !== userId))
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId('')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Connections</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {!loading && connections.length === 0 && (
        <p className="mt-4 text-sm text-text-faint">You haven't connected with anyone yet.</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {connections.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
            <div>
              <Link
                to={`/profile/${c.id}`}
                className="text-sm text-success hover:text-success-hover hover:underline"
              >
                {personName(c.profile) || c.email}
              </Link>
              {c.profile?.professionalTitle && (
                <p className="text-sm text-text-faint">{c.profile.professionalTitle}</p>
              )}
            </div>
            <button
              type="button"
              disabled={removingId === c.id}
              onClick={() => handleRemove(c.id)}
              className="text-sm text-danger hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ConnectionsList
