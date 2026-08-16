import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

function PendingManagerRequests({ venueId }) {
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState('')

  function refresh() {
    return api.fetchVenueNominationsForVenue(venueId).then(setNominations)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId])

  async function handleApprove(id) {
    setError('')
    setActionId(id)
    try {
      await api.approveVenueManagerNomination(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId('')
    }
  }

  async function handleDecline(id) {
    setError('')
    setActionId(id)
    try {
      await api.declineVenueManagerNomination(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Pending manager requests</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {!loading && nominations.length === 0 && (
          <p className="text-sm text-text-faint">No pending requests.</p>
        )}
        {nominations.map((nomination) => (
          <div key={nomination.id} className="rounded border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-text">
                  <span className="font-medium">{nomination.nominee?.name}</span> wants to manage this venue
                </p>
                <p className="mt-1 text-sm text-text-faint">{nomination.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(nomination.id)}
                  disabled={actionId === nomination.id}
                  className="rounded bg-success px-3 py-1.5 text-sm font-medium text-accent-text hover:brightness-110 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(nomination.id)}
                  disabled={actionId === nomination.id}
                  className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingManagerRequests
