import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import VerificationBadge from '../components/venue/VerificationBadge'

function VenueDirectory() {
  const [venues, setVenues] = useState([])
  const [sort, setSort] = useState('createdAt_desc')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .fetchVenues({ sort, search })
      .then(setVenues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sort, search])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Venues</h1>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
              Back to dashboard
            </Link>
            <Link
              to="/venues/new"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              + Create Venue
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="w-64 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Sort:</span>
            <button
              onClick={() => setSort('createdAt_desc')}
              className={`rounded px-3 py-1 ${
                sort === 'createdAt_desc' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSort('name_asc')}
              className={`rounded px-3 py-1 ${
                sort === 'name_asc' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              A–Z
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3">
          {!loading && venues.length === 0 && (
            <p className="text-sm text-gray-500">No venues found.</p>
          )}
          {venues.map((venue) => (
            <Link
              key={venue.id}
              to={`/venues/${venue.id}`}
              className="flex items-center justify-between rounded-lg bg-white p-4 shadow hover:shadow-md"
            >
              <div>
                <p className="font-medium text-gray-900">{venue.name}</p>
                <p className="text-sm text-gray-500">
                  {[venue.city?.name, venue.state, venue.country].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <VerificationBadge status={venue.verificationStatus} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VenueDirectory
