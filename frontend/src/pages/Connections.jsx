import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import ConnectionButton from '../components/ConnectionButton'
import PersonCard from '../components/PersonCard'

function Connections() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    api
      .fetchConnections()
      .then(setConnections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleRemove(userId) {
    setError('')
    setRemovingId(userId)
    try {
      await api.removeConnection(userId)
      setConnections((prev) => prev.filter((c) => c.id !== userId))
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId('')
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">My connections</h1>
          <Link to="/discover" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Discover people
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {!loading && connections.length === 0 && (
          <p className="text-sm text-text-faint">You haven't connected with anyone yet.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {connections.map((c) => (
            <PersonCard key={c.id} person={c}>
              <div className="flex items-center gap-3">
                <ConnectionButton status="connected" />
                <button
                  type="button"
                  disabled={removingId === c.id}
                  onClick={() => handleRemove(c.id)}
                  className="text-sm text-danger hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </PersonCard>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Connections
