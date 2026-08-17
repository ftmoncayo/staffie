import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function AdminJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .fetchAdminJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Job admin</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Posted by</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Applicants</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-medium text-text hover:text-accent hover:underline"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {job.venue ? (
                      <Link
                        to={`/venues/${job.venue.id}`}
                        className="text-accent hover:text-accent-hover hover:underline"
                      >
                        {job.venue.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {job.status === 'CLOSED' ? (
                      <span className="rounded bg-warning-bg px-2 py-0.5 text-xs text-warning">Closed</span>
                    ) : (
                      <span className="rounded bg-success-bg px-2 py-0.5 text-xs text-success">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    <Link
                      to={`/profile/${job.postedBy.id}`}
                      className="text-accent hover:text-accent-hover hover:underline"
                    >
                      {job.postedBy.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(job.createdAt)}</td>
                  <td className="px-4 py-3 text-text-muted">{job.applicationCount}</td>
                </tr>
              ))}
              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-faint">
                    No jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminJobs
