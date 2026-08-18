import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

const OTHER_VALUE = '__other__'

function Waitlist() {
  const [venues, setVenues] = useState([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [venueChoice, setVenueChoice] = useState('')
  const [otherVenueName, setOtherVenueName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api
      .fetchWaitlistVenues()
      .then(setVenues)
      .catch(() => {})
  }, [])

  function handleVenueChoiceChange(value) {
    setVenueChoice(value)
    if (value !== OTHER_VALUE) setOtherVenueName('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.joinWaitlist({
        email,
        name: name || undefined,
        venueId: venueChoice && venueChoice !== OTHER_VALUE ? venueChoice : undefined,
        otherVenueName: venueChoice === OTHER_VALUE ? otherVenueName : undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface p-8 text-center">
          <h1 className="text-2xl font-semibold text-text">You're on the list!</h1>
          <p className="text-sm text-text-muted">We'll be in touch when the next release opens up.</p>
          <Link to="/login" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface p-8"
      >
        <h1 className="text-2xl font-semibold text-text">Join the waitlist</h1>
        <p className="text-sm text-text-muted">
          Signups currently need a code. Leave your details and we'll reach out for the next release.
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}

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

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Name (optional)
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Your venue (optional)
          <select
            value={venueChoice}
            onChange={(e) => handleVenueChoiceChange(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          >
            <option value="">Select a venue...</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value={OTHER_VALUE}>Other (not listed yet)</option>
          </select>
        </label>

        {venueChoice === OTHER_VALUE && (
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Venue name
            <input
              type="text"
              value={otherVenueName}
              onChange={(e) => setOtherVenueName(e.target.value)}
              className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Join waitlist'}
        </button>

        <p className="text-sm text-text-muted">
          Have a code?{' '}
          <Link to="/signup" className="text-accent hover:text-accent-hover hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Waitlist
