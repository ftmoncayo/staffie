import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function locationSummary(business) {
  if (business.locationScope === 'GLOBAL') return 'Global'
  if (business.locationScope === 'COUNTRY') return business.country?.name || '—'
  const names = business.locations.map((c) => c.name)
  return names.length ? names.join(', ') : '—'
}

function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([])
  const [nominations, setNominations] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [nominationsLoading, setNominationsLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState('')
  const [nominationActionId, setNominationActionId] = useState('')

  function refresh() {
    return api.fetchAdminBusinesses(search).then(setBusinesses)
  }

  function refreshNominations() {
    return api.fetchBusinessManagerNominations().then(setNominations)
  }

  useEffect(() => {
    setLoading(true)
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    refreshNominations()
      .catch((err) => setError(err.message))
      .finally(() => setNominationsLoading(false))
  }, [])

  async function handleToggleVerified(id, verified) {
    setError('')
    setVerifyingId(id)
    try {
      await api.verifyBusiness(id, verified)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifyingId('')
    }
  }

  async function handleApproveNomination(id) {
    setError('')
    setNominationActionId(id)
    try {
      await api.approveBusinessManagerNomination(id)
      await refreshNominations()
    } catch (err) {
      setError(err.message)
    } finally {
      setNominationActionId('')
    }
  }

  async function handleDeclineNomination(id) {
    setError('')
    setNominationActionId(id)
    try {
      await api.declineBusinessManagerNomination(id)
      await refreshNominations()
    } catch (err) {
      setError(err.message)
    } finally {
      setNominationActionId('')
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Business admin</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text">Pending manager nominations</h2>
          {!nominationsLoading && nominations.length === 0 && (
            <p className="text-sm text-text-faint">No pending nominations.</p>
          )}
          {nominations.map((nomination) => (
            <div key={nomination.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-text">
                    <span className="font-medium">{nomination.nominee?.email}</span> wants to manage{' '}
                    {nomination.target ? (
                      <Link
                        to={`/businesses/${nomination.target.id}`}
                        className="font-medium text-accent hover:text-accent-hover hover:underline"
                      >
                        {nomination.target.name}
                      </Link>
                    ) : (
                      'a business that no longer exists'
                    )}
                  </p>
                  <p className="mt-1 text-sm text-text-faint">{nomination.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleApproveNomination(nomination.id)}
                    disabled={nominationActionId === nomination.id}
                    className="rounded bg-success px-3 py-1.5 text-sm font-medium text-accent-text hover:brightness-110 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDeclineNomination(nomination.id)}
                    disabled={nominationActionId === nomination.id}
                    className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-text">Businesses</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category..."
              className="w-72 rounded border border-border-strong bg-surface px-3 py-2 text-sm text-text focus:border-accent"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Verified</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Locations</th>
                  <th className="px-4 py-3 font-medium">Managers</th>
                  <th className="px-4 py-3 font-medium">Followers</th>
                  <th className="px-4 py-3 font-medium">Favourites</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((business) => (
                  <tr key={business.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/businesses/${business.id}`}
                        className="font-medium text-text hover:text-accent hover:underline"
                      >
                        {business.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={business.verificationStatus === 'VERIFIED'}
                        disabled={verifyingId === business.id}
                        onChange={(e) => handleToggleVerified(business.id, e.target.checked)}
                        className="h-4 w-4 accent-accent disabled:opacity-50"
                        aria-label={`Toggle verification for ${business.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{business.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{locationSummary(business)}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {business.managers.length > 0
                        ? business.managers.map((m, i) => (
                            <span key={m.id}>
                              {i > 0 && ', '}
                              <Link
                                to={`/profile/${m.id}`}
                                className="text-accent hover:text-accent-hover hover:underline"
                              >
                                {m.name}
                              </Link>
                            </span>
                          ))
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{business.followerCount}</td>
                    <td className="px-4 py-3 text-text-muted">{business.favouriteCount}</td>
                  </tr>
                ))}
                {!loading && businesses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-text-faint">
                      No businesses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminBusinesses
