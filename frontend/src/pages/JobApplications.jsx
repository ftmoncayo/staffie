import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function ApplicantCard({ application }) {
  const { applicant, note, createdAt } = application
  const name = applicant.profile
    ? [applicant.profile.firstName, applicant.profile.lastName].filter(Boolean).join(' ')
    : applicant.email

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to={`/profile/${applicant.id}`}
            className="font-semibold text-text hover:text-accent hover:underline"
          >
            {name}
          </Link>
          {applicant.profile?.professionalTitle && (
            <p className="text-sm text-text-muted">{applicant.profile.professionalTitle}</p>
          )}
          {applicant.profile?.city?.name && (
            <p className="text-sm text-text-faint">{applicant.profile.city.name}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-text-faint">Applied {formatDate(createdAt)}</span>
      </div>
      {note && <p className="text-sm text-text">{note}</p>}
    </div>
  )
}

function JobApplications() {
  const { id } = useParams()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchJobApplications(id)
      .then(setApplications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Applications</h1>
          <Link to={`/jobs/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to job
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          {!loading && applications.length === 0 && (
            <p className="text-sm text-text-faint">No applications yet.</p>
          )}
          {applications.map((application) => (
            <ApplicantCard key={application.id} application={application} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default JobApplications
