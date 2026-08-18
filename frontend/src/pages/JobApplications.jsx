import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import Modal from '../components/Modal'

const NOTE_WORD_LIMIT = 8

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function truncateNote(note) {
  const words = note.trim().split(/\s+/)
  if (words.length <= NOTE_WORD_LIMIT) return note
  return `${words.slice(0, NOTE_WORD_LIMIT).join(' ')}…`
}

function JobApplications() {
  const { id } = useParams()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openNote, setOpenNote] = useState(null)

  useEffect(() => {
    api
      .fetchJobApplications(id)
      .then(setApplications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Applications</h1>
          <Link to={`/jobs/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to job
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint">
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Skill match</th>
                <th className="px-4 py-3 font-medium">Knowledge match</th>
                <th className="px-4 py-3 font-medium">Mutual connections</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Applied</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => {
                const { applicant, note, createdAt, skillMatchCount, knowledgeMatchCount, mutualConnectionsAtVenue } =
                  application
                const name = applicant.profile
                  ? [applicant.profile.firstName, applicant.profile.lastName].filter(Boolean).join(' ')
                  : applicant.email
                const truncated = note ? truncateNote(note) : ''
                const isTruncated = truncated !== note

                return (
                  <tr key={application.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/profile/${applicant.id}`}
                        className="font-medium text-success hover:text-success-hover hover:underline"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{skillMatchCount}</td>
                    <td className="px-4 py-3 text-text-muted">{knowledgeMatchCount}</td>
                    <td className="px-4 py-3 text-text-muted">{mutualConnectionsAtVenue}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {!note && '—'}
                      {note &&
                        (isTruncated ? (
                          <button
                            type="button"
                            onClick={() => setOpenNote({ name, note })}
                            className="text-left text-accent hover:text-accent-hover hover:underline"
                          >
                            {truncated}
                          </button>
                        ) : (
                          note
                        ))}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(createdAt)}</td>
                  </tr>
                )
              })}
              {!loading && applications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-faint">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(openNote)} onClose={() => setOpenNote(null)} title={openNote ? `${openNote.name}'s note` : ''}>
        <p className="whitespace-pre-wrap text-sm text-text">{openNote?.note}</p>
      </Modal>
    </div>
  )
}

export default JobApplications
