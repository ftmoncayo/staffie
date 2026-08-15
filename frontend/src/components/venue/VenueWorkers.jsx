import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

function personName(profile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function VenueWorkers({ venueId }) {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchVenueWorkers(venueId)
      .then(setWorkers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [venueId])

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">People who've worked here</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {!loading && workers.length === 0 && (
        <p className="mt-4 text-sm text-text-faint">No one has logged experience at this venue yet.</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {workers.map((w) => (
          <div key={w.id} className="rounded border border-border px-3 py-2">
            <p className="text-sm text-text">{personName(w.profile) || w.email}</p>
            {w.profile?.professionalTitle && (
              <p className="text-sm text-text-faint">{w.profile.professionalTitle}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default VenueWorkers
