import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Visible to everyone as view-only; canEdit adds per-event Edit and
// Duplicate actions for that venue/business's managers/admin.
function PastEvents({ ownerType, ownerId, canEdit }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchEvents({ ownerType, ownerId, when: 'past', scope: null })
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [ownerType, ownerId])

  const newEventPath =
    ownerType === 'VENUE' ? `/venues/${ownerId}/events/new` : `/businesses/${ownerId}/events/new`

  if (loading) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-text">Past events</h2>
      {error && <p className="text-sm text-danger">{error}</p>}
      {events.length === 0 && <p className="text-sm text-text-faint">No past events yet.</p>}
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <Link to={`/events/${event.id}`} className="flex-1">
            <p className="font-medium text-text hover:text-accent">{event.title}</p>
            <p className="text-sm text-text-faint">
              {formatDateTime(event.startAt)} · {event.category.name}
            </p>
          </Link>
          {canEdit && (
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <Link
                to={`/events/${event.id}?edit=true`}
                className="text-accent hover:text-accent-hover hover:underline"
              >
                Edit
              </Link>
              <Link
                to={`${newEventPath}?duplicateFrom=${event.id}`}
                className="text-accent hover:text-accent-hover hover:underline"
              >
                Duplicate
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default PastEvents
