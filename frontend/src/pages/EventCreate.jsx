import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import EventForm from '../components/event/EventForm'

// Prefills the location fields from the owner venue/business's own location
// at creation time only — the location then lives on the Event itself and
// is independently editable thereafter (EventForm/routes/events.js never
// re-derive it from the owner again).
function EventCreate({ ownerType }) {
  const { ownerId } = useParams()
  const navigate = useNavigate()
  const [initialLocation, setInitialLocation] = useState(null)
  const [backLink, setBackLink] = useState('/home')

  useEffect(() => {
    async function loadOwnerLocation() {
      if (ownerType === 'VENUE') {
        const venue = await api.fetchVenue(ownerId)
        setBackLink(`/venues/${ownerId}`)
        setInitialLocation({
          country: venue.city?.state?.country || null,
          state: venue.city?.state || null,
          city: venue.city || null,
          suburb: venue.suburb || null,
        })
      } else {
        const business = await api.fetchBusiness(ownerId)
        setBackLink(`/businesses/${ownerId}`)
        setInitialLocation({
          country: business.country || null,
          state: null,
          city: business.locations?.[0]?.city || null,
          suburb: null,
        })
      }
    }
    loadOwnerLocation().catch(() => {})
  }, [ownerType, ownerId])

  async function handleSubmit(data) {
    const event = await api.createEvent({ ...data, ownerType, ownerId })
    navigate(`/events/${event.id}`)
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Create event</h1>
          <Link to={backLink} className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back
          </Link>
        </div>

        <EventForm initialLocation={initialLocation} onSubmit={handleSubmit} submitLabel="Create event" />
      </div>
    </div>
  )
}

export default EventCreate
