import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    api
      .fetchAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Users</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Venue admin</th>
                <th className="px-4 py-3 font-medium">Manages</th>
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
                      ? user.managedVenues.map((v) => v.name).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-faint">
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
