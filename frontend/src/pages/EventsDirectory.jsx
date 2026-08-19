import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import SearchCombobox from '../components/SearchCombobox'
import LocationScopeFilter from '../components/LocationScopeFilter'
import useLocationScopeFilter from '../hooks/useLocationScopeFilter'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function EventCard({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-text">{event.title}</p>
          <p className="text-sm text-text-muted">{event.owner.name}</p>
        </div>
        <span className="shrink-0 rounded border border-border-strong px-2 py-0.5 text-xs text-text-muted">
          {event.category.name}
        </span>
      </div>
      <p className="text-sm text-text-faint">{formatDateTime(event.startAt)}</p>
      {event.locationVenue && (
        <p className="text-sm text-text-faint">
          {[event.locationVenue.name, event.locationVenue.city?.name].filter(Boolean).join(', ')}
        </p>
      )}
    </Link>
  )
}

function EventsDirectory({ mine = false }) {
  const [events, setEvents] = useState([])
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { selection, setSelection, scope } = useLocationScopeFilter()

  useEffect(() => {
    setLoading(true)
    api
      .fetchEvents({ scope, categoryId: category?.id, mine })
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [category, mine, scope])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">{mine ? 'My Events' : 'Events'}</h1>
          <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to home
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <LocationScopeFilter {...selection} onChange={setSelection} />
          <div className="w-64">
            <SearchCombobox
              fetchOptions={api.fetchEventCategories}
              onSelect={setCategory}
              allowCreate={false}
              initialQuery={category?.name || ''}
              placeholder="Filter by category..."
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          {!loading && events.length === 0 && (
            <p className="text-sm text-text-faint">
              {mine ? 'No upcoming events at anything you manage.' : 'No upcoming events found.'}
            </p>
          )}
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default EventsDirectory
