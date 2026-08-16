import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'

function InviteSomeone() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [venueId, setVenueId] = useState(searchParams.get('venueId') || '')
  const [venues, setVenues] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .fetchProfile()
      .then((data) => {
        const seen = new Set()
        const options = []
        for (const exp of data.profile?.experiences || []) {
          if (!seen.has(exp.venue.id)) {
            seen.add(exp.venue.id)
            options.push(exp.venue)
          }
        }
        setVenues(options)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await api.sendInvite(email, venueId || null)
      setMessage(result.message)
      setEmail('')
      setVenueId('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Invite someone</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
        >
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-accent">{message}</p>}

          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
            />
          </label>

          {venues.length > 0 && (
            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Venue (optional) — tell them you work together
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
              >
                <option value="">No specific venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send invite'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default InviteSomeone
