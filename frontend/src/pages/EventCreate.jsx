import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import EventForm from '../components/event/EventForm'

// Prefills the location venue from the owner venue itself at creation time
// only — once set, the location lives on the Event itself and is
// independently editable thereafter (EventForm/routes/events.js never
// re-derive it from the owner again). Business-owned events have no single
// fixed location, so they start unset unless the creator picks one.
//
// `?duplicateFrom=<eventId>` pre-fills title/description/category/skills/
// knowledge from an existing event (see PastEvents' Duplicate action) —
// deliberately not the date or location, so the creator supplies both fresh.
function EventCreate({ ownerType }) {
  const { ownerId } = useParams()
  const [searchParams] = useSearchParams()
  const duplicateFromId = searchParams.get('duplicateFrom')
  const navigate = useNavigate()
  const [backLink, setBackLink] = useState('/home')
  const [initialLocationVenue, setInitialLocationVenue] = useState(null)
  const [duplicateSource, setDuplicateSource] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (ownerType === 'VENUE') {
        const venue = await api.fetchVenue(ownerId)
        setBackLink(`/venues/${ownerId}`)
        setInitialLocationVenue({ id: venue.id, name: venue.name })
      } else {
        setBackLink(`/businesses/${ownerId}`)
      }
      if (duplicateFromId) {
        const source = await api.fetchEvent(duplicateFromId)
        setDuplicateSource(source)
      }
    }
    load()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ownerType, ownerId, duplicateFromId])

  async function handleSubmit(data) {
    const event = await api.createEvent({ ...data, ownerType, ownerId })
    navigate(`/events/${event.id}`)
  }

  if (loading) return null

  const initial = duplicateSource
    ? {
        title: duplicateSource.title,
        description: duplicateSource.description,
        category: duplicateSource.category,
        skills: duplicateSource.skills,
        knowledgeAreas: duplicateSource.knowledgeAreas,
      }
    : undefined

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">
            {duplicateSource ? 'Duplicate event' : 'Create event'}
          </h1>
          <Link to={backLink} className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back
          </Link>
        </div>

        <EventForm
          initial={initial}
          initialLocationVenue={initialLocationVenue}
          onSubmit={handleSubmit}
          submitLabel="Create event"
        />
      </div>
    </div>
  )
}

export default EventCreate
