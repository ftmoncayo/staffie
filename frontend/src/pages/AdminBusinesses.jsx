import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState('')

  function refresh() {
    return api.fetchBusinesses({ status: 'UNVERIFIED', sort: 'createdAt_desc' }).then(setBusinesses)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleApprove(id) {
    setError('')
    setApprovingId(id)
    try {
      await api.verifyBusiness(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setApprovingId('')
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Unverified businesses</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          {!loading && businesses.length === 0 && (
            <p className="text-sm text-text-faint">No unverified businesses.</p>
          )}
          {businesses.map((business) => (
            <div
              key={business.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <Link
                  to={`/businesses/${business.id}`}
                  className="font-medium text-text hover:text-accent hover:underline"
                >
                  {business.name}
                </Link>
                <p className="text-sm text-text-faint">{business.category?.name || '—'}</p>
              </div>
              <button
                onClick={() => handleApprove(business.id)}
                disabled={approvingId === business.id}
                className="rounded bg-success px-4 py-2 text-sm font-medium text-accent-text hover:brightness-110 disabled:opacity-50"
              >
                {approvingId === business.id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminBusinesses
