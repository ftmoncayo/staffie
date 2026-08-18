import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import EventForm from '../components/event/EventForm'
import Tag from '../components/Tag'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function ownerLink(event) {
  return event.ownerType === 'VENUE' ? `/venues/${event.ownerId}` : `/businesses/${event.ownerId}`
}

const INTEREST_LABELS = {
  INTERESTED: 'Interested',
  ATTENDED: 'Attended',
  DID_NOT_ATTEND: 'Did not attend',
}

function EventDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [event, setEvent] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [interestError, setInterestError] = useState('')

  useEffect(() => {
    api
      .fetchEvent(id)
      .then((data) => {
        setEvent(data)
        if (searchParams.get('edit') === 'true' && data.canEdit) setEditing(true)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSave(data) {
    const updated = await api.updateEvent(id, data)
    setEvent(updated)
    setEditing(false)
  }

  async function handleInterest(e) {
    e.preventDefault()
    setInterestError('')
    setSubmitting(true)
    try {
      const interest = await api.submitEventInterest(id, note)
      setEvent((prev) => ({ ...prev, myInterest: interest }))
    } catch (err) {
      setInterestError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/events" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Event</h1>
          <Link to="/events" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to events
          </Link>
        </div>

        {editing ? (
          <EventForm initial={event} submitLabel="Save" onSubmit={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-text">{event.title}</h2>
                <Link
                  to={ownerLink(event)}
                  className="text-sm text-accent hover:text-accent-hover hover:underline"
                >
                  {event.owner.name}
                </Link>
              </div>
              {event.canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 text-sm text-accent hover:text-accent-hover hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            <p className="mt-4 whitespace-pre-wrap text-text">{event.description}</p>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-text-faint">Category</dt>
                <dd className="text-text">{event.category.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-faint">When</dt>
                <dd className="text-text">
                  {formatDateTime(event.startAt)}
                  {event.endAt ? ` – ${formatDateTime(event.endAt)}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-faint">Location</dt>
                <dd className="text-text">
                  {event.locationVenue ? (
                    <Link
                      to={`/venues/${event.locationVenue.id}`}
                      className="text-accent hover:text-accent-hover hover:underline"
                    >
                      {event.locationVenue.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>

            {event.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-text-faint">Skills developed</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {event.skills.map((s) => (
                    <Tag key={s.id}>{s.name}</Tag>
                  ))}
                </div>
              </div>
            )}

            {event.knowledgeAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-text-faint">Knowledge developed</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {event.knowledgeAreas.map((k) => (
                    <Tag key={k.id}>{k.name}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!editing && !event.canEdit && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold text-text">Interest</h2>
            {event.myInterest ? (
              <span className="mt-2 inline-block rounded border border-accent px-3 py-1.5 text-sm font-medium text-accent">
                {INTEREST_LABELS[event.myInterest.status]}
              </span>
            ) : (
              <form onSubmit={handleInterest} className="mt-4 flex flex-col gap-3">
                {interestError && <p className="text-sm text-danger">{interestError}</p>}
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  Note (optional)
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="self-start rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : "I'm interested"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EventDetail
