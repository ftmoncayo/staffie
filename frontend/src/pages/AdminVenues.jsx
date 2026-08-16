import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function AdminVenues() {
  const [venues, setVenues] = useState([])
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)
  const [nominationsLoading, setNominationsLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState('')
  const [nominationActionId, setNominationActionId] = useState('')

  function refresh() {
    return api.fetchVenues({ status: 'UNVERIFIED', sort: 'createdAt_desc' }).then(setVenues)
  }

  function refreshNominations() {
    return api.fetchVenueManagerNominations().then(setNominations)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    refreshNominations()
      .catch((err) => setError(err.message))
      .finally(() => setNominationsLoading(false))
  }, [])

  async function handleApprove(id) {
    setError('')
    setApprovingId(id)
    try {
      await api.verifyVenue(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setApprovingId('')
    }
  }

  async function handleApproveNomination(id) {
    setError('')
    setNominationActionId(id)
    try {
      await api.approveVenueManagerNomination(id)
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
      await api.declineVenueManagerNomination(id)
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
          <h1 className="text-2xl font-semibold text-text">Unverified venues</h1>
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
                        to={`/venues/${nomination.target.id}`}
                        className="font-medium text-accent hover:text-accent-hover hover:underline"
                      >
                        {nomination.target.name}
                      </Link>
                    ) : (
                      'a venue that no longer exists'
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
          <h2 className="text-xl font-semibold text-text">Unverified venues</h2>
          {!loading && venues.length === 0 && (
            <p className="text-sm text-text-faint">No unverified venues.</p>
          )}
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <Link to={`/venues/${venue.id}`} className="font-medium text-text hover:text-accent hover:underline">
                  {venue.name}
                </Link>
                <p className="text-sm text-text-faint">
                  {[venue.suburb?.name, venue.city?.name, venue.state, venue.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>
              <button
                onClick={() => handleApprove(venue.id)}
                disabled={approvingId === venue.id}
                className="rounded bg-success px-4 py-2 text-sm font-medium text-accent-text hover:brightness-110 disabled:opacity-50"
              >
                {approvingId === venue.id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminVenues
