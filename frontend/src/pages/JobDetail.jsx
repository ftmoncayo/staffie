import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import JobForm from '../components/job/JobForm'
import Tag from '../components/Tag'

function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')

  useEffect(() => {
    api
      .fetchJob(id)
      .then(setJob)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(data) {
    const updated = await api.updateJob(id, data)
    setJob(updated)
    setEditing(false)
  }

  async function handleApply(e) {
    e.preventDefault()
    setApplyError('')
    setApplying(true)
    try {
      await api.applyToJob(id, note)
      setJob((prev) => ({ ...prev, hasApplied: true, myApplicationNote: note.trim() || null }))
    } catch (err) {
      setApplyError(err.message)
    } finally {
      setApplying(false)
    }
  }

  if (loading) return null

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/jobs" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to jobs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Job</h1>
          <Link to="/jobs" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to jobs
          </Link>
        </div>

        {editing ? (
          <JobForm
            initial={job}
            isEditing
            submitLabel="Save"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-text">
                  {job.title}
                  {job.status === 'CLOSED' && (
                    <span className="ml-2 rounded bg-warning-bg px-2 py-0.5 text-xs font-normal text-warning">
                      Closed
                    </span>
                  )}
                </h2>
                <Link
                  to={`/venues/${job.venue.id}`}
                  className="text-sm text-accent hover:text-accent-hover hover:underline"
                >
                  {job.venue.name}
                </Link>
              </div>
              {job.canEdit && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-accent hover:text-accent-hover hover:underline"
                  >
                    Edit
                  </button>
                  <Link
                    to={`/jobs/${id}/applications`}
                    className="text-sm text-accent hover:text-accent-hover hover:underline"
                  >
                    Applications
                  </Link>
                </div>
              )}
            </div>

            <p className="mt-4 whitespace-pre-wrap text-text">{job.description}</p>

            {job.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-text-faint">Desired skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <Tag key={s.id}>{s.name}</Tag>
                  ))}
                </div>
              </div>
            )}

            {job.knowledgeAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-text-faint">Desired knowledge areas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.knowledgeAreas.map((k) => (
                    <Tag key={k.id}>{k.name}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!editing && !job.canEdit && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold text-text">Apply</h2>
            {job.hasApplied ? (
              <div className="mt-2">
                <span className="inline-block rounded border border-accent px-3 py-1.5 text-sm font-medium text-accent">
                  Applied
                </span>
                {job.myApplicationNote && (
                  <p className="mt-2 text-sm text-text-faint">Your note: {job.myApplicationNote}</p>
                )}
              </div>
            ) : job.status !== 'OPEN' ? (
              <p className="mt-2 text-sm text-text-faint">This job is no longer accepting applications.</p>
            ) : (
              <form onSubmit={handleApply} className="mt-4 flex flex-col gap-3">
                {applyError && <p className="text-sm text-danger">{applyError}</p>}
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
                  disabled={applying}
                  className="self-start rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Apply'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default JobDetail
