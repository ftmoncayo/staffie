import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import VenueForm from '../components/venue/VenueForm'
import VerificationBadge from '../components/venue/VerificationBadge'

function VenueDetail() {
  const { id } = useParams()
  const [venue, setVenue] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchVenue(id)
      .then(setVenue)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(data) {
    const updated = await api.updateVenue(id, data)
    setVenue(updated)
    setEditing(false)
  }

  if (loading) return null

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/venues" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to venues
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Venue</h1>
          <Link to="/venues" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to venues
          </Link>
        </div>

        {editing ? (
          <VenueForm initial={venue} onSubmit={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text">{venue.name}</h2>
                <div className="mt-1">
                  <VerificationBadge status={venue.verificationStatus} />
                </div>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-accent hover:text-accent-hover hover:underline"
              >
                Edit
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-text-faint">Location</dt>
                <dd className="text-text">
                  {[venue.city?.name, venue.state, venue.country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-faint">Type</dt>
                <dd className="text-text">{venue.venueType || '—'}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <dt className="text-sm text-text-faint">Specialties</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {venue.specialties.length === 0 && <span className="text-text">—</span>}
                {venue.specialties.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-sm text-accent"
                  >
                    {s.name}
                  </span>
                ))}
              </dd>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VenueDetail
