import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .fetchAdminUsers(search)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [search])

  async function handleToggle(userId, flag, value) {
    setError('')
    setUpdatingId(userId)
    try {
      const updated = await api.updateUserFlags(userId, { [flag]: value })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId('')
    }
  }

  async function handleToggleBlocked(user) {
    setError('')
    setUpdatingId(user.id)
    try {
      const updated = user.isBlocked ? await api.unblockUser(user.id) : await api.blockUser(user.id)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Users</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-72 rounded border border-border-strong bg-surface px-3 py-2 text-sm text-text focus:border-accent"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Venue admin</th>
                <th className="px-4 py-3 font-medium">Manages venues</th>
                <th className="px-4 py-3 font-medium">Manages businesses</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text">{user.name || '—'}</td>
                  <td className="px-4 py-3 text-text">{user.email}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={user.isAdmin}
                      disabled={updatingId === user.id}
                      onChange={(e) => handleToggle(user.id, 'isAdmin', e.target.checked)}
                      className="h-4 w-4 accent-accent disabled:opacity-50"
                      aria-label={`Toggle admin for ${user.email}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={user.isVenueAdmin}
                      disabled={updatingId === user.id}
                      onChange={(e) => handleToggle(user.id, 'isVenueAdmin', e.target.checked)}
                      className="h-4 w-4 accent-accent disabled:opacity-50"
                      aria-label={`Toggle venue admin for ${user.email}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.managedVenues.length > 0
                      ? user.managedVenues.map((v, i) => (
                          <span key={v.id}>
                            {i > 0 && ', '}
                            <Link
                              to={`/venues/${v.id}`}
                              className="text-accent hover:text-accent-hover hover:underline"
                            >
                              {v.name}
                            </Link>
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.managedBusinesses.length > 0
                      ? user.managedBusinesses.map((b, i) => (
                          <span key={b.id}>
                            {i > 0 && ', '}
                            <Link
                              to={`/businesses/${b.id}`}
                              className="text-accent hover:text-accent-hover hover:underline"
                            >
                              {b.name}
                            </Link>
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.isBlocked && <span className="text-xs text-danger">Blocked</span>}
                      <button
                        type="button"
                        disabled={updatingId === user.id}
                        onClick={() => handleToggleBlocked(user)}
                        className={
                          user.isBlocked
                            ? 'rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50'
                            : 'rounded border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-50'
                        }
                      >
                        {user.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-text-faint">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminUsers
