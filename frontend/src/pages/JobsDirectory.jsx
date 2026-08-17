import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import SearchCombobox from '../components/SearchCombobox'

function JobCard({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-text">{job.title}</p>
          <p className="text-sm text-text-muted">
            {job.venue.name}
            {job.venue.isFavourite && (
              <span className="ml-2 text-accent" title="Favourited venue">
                ★
              </span>
            )}
            {!job.venue.isFavourite && job.venue.isFollowing && (
              <span className="ml-2 text-xs text-text-faint">Following</span>
            )}
          </p>
        </div>
        {job.hasApplied && (
          <span className="shrink-0 rounded border border-accent px-2 py-0.5 text-xs font-medium text-accent">
            Applied
          </span>
        )}
      </div>
      <p className="text-sm text-text-faint">
        {job.skillMatchCount} skill{job.skillMatchCount === 1 ? '' : 's'} matched, {job.knowledgeMatchCount}{' '}
        knowledge area{job.knowledgeMatchCount === 1 ? '' : 's'} matched
      </p>
      <p className="text-sm text-text-faint">
        {job.mutualConnectionsAtVenue} mutual connection{job.mutualConnectionsAtVenue === 1 ? '' : 's'} at this
        venue
      </p>
    </Link>
  )
}

function MyJobCard({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-hover"
    >
      <div>
        <p className="font-medium text-text">{job.title}</p>
        <p className="text-sm text-text-muted">{job.venue.name}</p>
        <p className="text-sm text-text-faint">
          {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}
        </p>
      </div>
      {job.status === 'CLOSED' && (
        <span className="shrink-0 rounded bg-warning-bg px-2 py-0.5 text-xs text-warning">Closed</span>
      )}
    </Link>
  )
}

function JobsDirectory({ mine = false }) {
  const [jobs, setJobs] = useState([])
  const [city, setCity] = useState(null)
  const [sort, setSort] = useState('recent')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .fetchJobs({ cityId: mine ? undefined : city?.id, sort: mine ? undefined : sort, mine })
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [city, sort, mine])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">{mine ? 'My jobs' : 'Jobs'}</h1>
          <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to home
          </Link>
        </div>

        {!mine && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <SearchCombobox
                fetchOptions={api.fetchCities}
                onSelect={setCity}
                allowCreate={false}
                initialQuery={city?.name || ''}
                placeholder="Filter by city..."
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-faint">Sort:</span>
              <button
                onClick={() => setSort('recent')}
                className={`rounded px-3 py-1 ${
                  sort === 'recent' ? 'bg-accent text-accent-text' : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSort('match')}
                className={`rounded px-3 py-1 ${
                  sort === 'match' ? 'bg-accent text-accent-text' : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                Best Match
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-3">
          {!loading && jobs.length === 0 && (
            <p className="text-sm text-text-faint">
              {mine ? 'No jobs posted at venues you manage yet.' : 'No jobs found.'}
            </p>
          )}
          {jobs.map((job) => (mine ? <MyJobCard key={job.id} job={job} /> : <JobCard key={job.id} job={job} />))}
        </div>
      </div>
    </div>
  )
}

export default JobsDirectory
