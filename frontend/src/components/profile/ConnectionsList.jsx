import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

function personName(profile) {
  if (!profile) return null
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function ConnectionsList() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchConnections()
      .then(setConnections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Connections</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {!loading && connections.length === 0 && (
        <p className="mt-4 text-sm text-text-faint">You haven't connected with anyone yet.</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {connections.map((c) => (
          <div key={c.id} className="rounded border border-border px-3 py-2">
            <p className="text-sm text-text">{personName(c.profile) || c.email}</p>
            {c.profile?.professionalTitle && (
              <p className="text-sm text-text-faint">{c.profile.professionalTitle}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ConnectionsList
