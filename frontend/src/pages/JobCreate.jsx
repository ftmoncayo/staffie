import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import JobForm from '../components/job/JobForm'

function JobCreate() {
  const { venueId } = useParams()
  const navigate = useNavigate()

  async function handleSubmit(data) {
    const job = await api.createJob({ ...data, venueId })
    navigate(`/jobs/${job.id}`)
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Post a job</h1>
          <Link to={`/venues/${venueId}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to venue
          </Link>
        </div>

        <JobForm onSubmit={handleSubmit} submitLabel="Post job" />
      </div>
    </div>
  )
}

export default JobCreate
