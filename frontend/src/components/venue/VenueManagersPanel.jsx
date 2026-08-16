import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import { displayName } from '../../lib/displayName'

async function fetchUserOptions(search) {
  const users = await api.fetchUsers(search)
  return users.map((u) => ({ id: u.id, name: u.name }))
}

function VenueManagersPanel({ venueId }) {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState('')
  const [confirmingId, setConfirmingId] = useState('')

  function refresh() {
    return api.fetchVenueManagers(venueId).then(setManagers)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [venueId])

  async function handleAdd(item) {
    setError('')
    try {
      await api.addVenueManager(venueId, item.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemove(userId) {
    setError('')
    setRemovingId(userId)
    try {
      await api.removeVenueManager(venueId, userId)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId('')
    }
  }

  async function handleConfirm(userId) {
    setError('')
    setConfirmingId(userId)
    try {
      await api.confirmVenueManager(venueId, userId)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmingId('')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Manage venue managers</h2>
      <p className="mt-1 text-sm text-text-faint">
        Managers can edit this venue's details. Only admins can assign or remove managers.
      </p>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        <SearchCombobox
          fetchOptions={fetchUserOptions}
          onSelect={handleAdd}
          allowCreate={false}
          clearOnSelect
          placeholder="Search users by name..."
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {!loading && managers.length === 0 && (
          <p className="text-sm text-text-faint">No managers assigned yet.</p>
        )}
        {managers.map((manager) => (
          <div
            key={manager.id}
            className="flex items-center justify-between rounded border border-border px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm text-text">
              {displayName(manager.user)}
              {!manager.verified && (
                <span className="inline-flex items-center rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
                  Unverified
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              {!manager.verified && (
                <button
                  type="button"
                  disabled={confirmingId === manager.user.id}
                  onClick={() => handleConfirm(manager.user.id)}
                  className="text-sm text-accent hover:underline disabled:opacity-50"
                >
                  Confirm manager
                </button>
              )}
              <button
                type="button"
                disabled={removingId === manager.user.id}
                onClick={() => handleRemove(manager.user.id)}
                className="text-sm text-danger hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VenueManagersPanel
