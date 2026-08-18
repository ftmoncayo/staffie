import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import VerificationBadge from '../components/venue/VerificationBadge'
import LocationScopeFilter from '../components/LocationScopeFilter'
import useLocationScopeFilter from '../hooks/useLocationScopeFilter'

function BusinessDirectory({ mine = false }) {
  const [businesses, setBusinesses] = useState([])
  const [sort, setSort] = useState('createdAt_desc')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { selection, setSelection, scope, ready } = useLocationScopeFilter()

  useEffect(() => {
    if (!ready) return
    setLoading(true)
    api
      .fetchBusinesses({ sort, search, mine, scope })
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sort, search, mine, ready, scope?.type, scope?.id])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">{mine ? 'My businesses' : 'Businesses'}</h1>
          <div className="flex items-center gap-4">
            <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
              Back to home
            </Link>
            <Link
              to="/businesses/new"
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
            >
              + Create Business
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
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
          {!loading && businesses.length === 0 && (
            <p className="text-sm text-text-faint">
              {mine ? "You don't manage any businesses yet." : 'No businesses found.'}
            </p>
          )}
          {businesses.map((business) => (
            <Link
              key={business.id}
              to={`/businesses/${business.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-hover"
            >
              <div>
                <p className="font-medium text-text">{business.name}</p>
                <p className="text-sm text-text-faint">{business.category?.name || '—'}</p>
              </div>
              <VerificationBadge status={business.verificationStatus} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BusinessDirectory
