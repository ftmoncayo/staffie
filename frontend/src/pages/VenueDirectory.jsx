import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import VerificationBadge from '../components/venue/VerificationBadge'
import LocationScopeFilter from '../components/LocationScopeFilter'
import useLocationScopeFilter from '../hooks/useLocationScopeFilter'

function VenueDirectory({ mine = false }) {
  const [venues, setVenues] = useState([])
  const [sort, setSort] = useState('createdAt_desc')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { selection, setSelection, scope } = useLocationScopeFilter()

  useEffect(() => {
    setLoading(true)
    api
      .fetchVenues({ sort, search, mine, scope })
      .then(setVenues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sort, search, mine, scope])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">{mine ? 'My venues' : 'Venues'}</h1>
          <div className="flex items-center gap-4">
            <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
              Back to home
            </Link>
            <Link
              to="/venues/new"
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
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
            className="w-64 rounded border border-border-strong bg-surface px-3 py-2 text-sm text-text focus:border-accent"
          />
          <LocationScopeFilter {...selection} onChange={setSelection} />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-faint">Sort:</span>
            <button
              onClick={() => setSort('createdAt_desc')}
              className={`rounded px-3 py-1 ${
                sort === 'createdAt_desc'
                  ? 'bg-accent text-accent-text'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSort('name_asc')}
              className={`rounded px-3 py-1 ${
                sort === 'name_asc'
                  ? 'bg-accent text-accent-text'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              A–Z
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          {!loading && venues.length === 0 && (
            <p className="text-sm text-text-faint">
              {mine ? "You don't manage any venues yet." : 'No venues found.'}
            </p>
          )}
          {venues.map((venue) => (
            <Link
              key={venue.id}
              to={`/venues/${venue.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-hover"
            >
              <div>
                <p className="font-medium text-text">{venue.name}</p>
                <p className="text-sm text-text-faint">
                  {[venue.suburb?.name, venue.city?.name, venue.city?.state?.name, venue.city?.state?.country?.name]
                    .filter(Boolean)
                    .join(', ') || '—'}
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
