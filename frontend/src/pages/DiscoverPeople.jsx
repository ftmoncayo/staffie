import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import ConnectionButton from '../components/ConnectionButton'
import PersonCard from '../components/PersonCard'
import LocationScopeFilter from '../components/LocationScopeFilter'
import useLocationScopeFilter from '../hooks/useLocationScopeFilter'

function sharedSummary(shared) {
  if (!shared) return null
  const parts = []
  if (shared.skills > 0) parts.push(`${shared.skills} shared skill${shared.skills === 1 ? '' : 's'}`)
  if (shared.knowledgeAreas > 0) {
    parts.push(`${shared.knowledgeAreas} shared knowledge area${shared.knowledgeAreas === 1 ? '' : 's'}`)
  }
  if (shared.venues > 0) parts.push(`${shared.venues} shared venue${shared.venues === 1 ? '' : 's'}`)
  if (shared.connections > 0) {
    parts.push(`${shared.connections} mutual connection${shared.connections === 1 ? '' : 's'}`)
  }
  return parts.length > 0 ? parts.join(', ') : 'Nothing in common yet'
}

function DiscoverPeople() {
  const [lens, setLens] = useState('near')
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { selection, setSelection, scope } = useLocationScopeFilter()

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .discoverPeople(lens, scope)
      .then(setPeople)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [lens, scope])

  function updatePerson(userId, changes) {
    setPeople((prev) => prev.map((p) => (p.id === userId ? { ...p, ...changes } : p)))
  }

  async function handleConnect(person) {
    const request = await api.requestConnection(person.id)
    updatePerson(person.id, {
      connectionStatus: request.status === 'PENDING' ? 'pending-sent' : person.connectionStatus,
    })
  }

  async function handleAccept(person) {
    await api.acceptConnectionRequest(person.connectionRequestId)
    updatePerson(person.id, { connectionStatus: 'connected' })
  }

  async function handleDecline(person) {
    await api.declineConnectionRequest(person.connectionRequestId)
    updatePerson(person.id, { connectionStatus: 'none', connectionRequestId: null })
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Discover people</h1>
          <div className="flex items-center gap-4">
            <Link to="/connections" className="text-sm text-accent hover:text-accent-hover hover:underline">
              My connections
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LocationScopeFilter {...selection} onChange={setSelection} />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLens('near')}
            className={`rounded px-4 py-2 text-sm font-medium ${
              lens === 'near'
                ? 'bg-accent text-accent-text'
                : 'border border-border-strong text-text-muted hover:bg-surface-hover'
            }`}
          >
            Near me
          </button>
          <button
            type="button"
            onClick={() => setLens('common')}
            className={`rounded px-4 py-2 text-sm font-medium ${
              lens === 'common'
                ? 'bg-accent text-accent-text'
                : 'border border-border-strong text-text-muted hover:bg-surface-hover'
            }`}
          >
            Common ground
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {!loading && people.length === 0 && (
          <p className="text-sm text-text-faint">
            {lens === 'near' ? 'No one found in this location yet.' : 'No one to show yet.'}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              extra={lens === 'common' ? sharedSummary(person.shared) : null}
            >
              <ConnectionButton
                status={person.connectionStatus}
                onConnect={() => handleConnect(person)}
                onAccept={() => handleAccept(person)}
                onDecline={() => handleDecline(person)}
              />
            </PersonCard>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DiscoverPeople
