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
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">{error}</p>
          <Link to="/venues" className="text-sm text-blue-600 hover:underline">
            Back to venues
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Venue</h1>
          <Link to="/venues" className="text-sm text-blue-600 hover:underline">
            Back to venues
          </Link>
        </div>

        {editing ? (
          <VenueForm initial={venue} onSubmit={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{venue.name}</h2>
                <div className="mt-1">
                  <VerificationBadge status={venue.verificationStatus} />
                </div>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Edit
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500">Location</dt>
                <dd className="text-gray-900">
                  {[venue.city?.name, venue.state, venue.country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-gray-900">{venue.venueType || '—'}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <dt className="text-sm text-gray-500">Specialties</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {venue.specialties.length === 0 && <span className="text-gray-900">—</span>}
                {venue.specialties.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
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
