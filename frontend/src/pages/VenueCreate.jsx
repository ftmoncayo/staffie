import { Link, useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import VenueForm from '../components/venue/VenueForm'

function VenueCreate() {
  const navigate = useNavigate()

  async function handleSubmit(data) {
    const venue = await api.createVenue(data)
    navigate(`/venues/${venue.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Create venue</h1>
          <Link to="/venues" className="text-sm text-blue-600 hover:underline">
            Back to venues
          </Link>
        </div>

        <VenueForm onSubmit={handleSubmit} submitLabel="Create venue" />
      </div>
    </div>
  )
}

export default VenueCreate
