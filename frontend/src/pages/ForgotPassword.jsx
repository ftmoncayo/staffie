import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../lib/api'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold text-text">Forgot password</h1>

        {submitted ? (
          <p className="text-sm text-text-muted">
            If an account with that email exists, a password reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Enter your email and we'll send you a link to reset your password.
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

            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-sm text-text-muted">
          <Link to="/login" className="text-accent hover:text-accent-hover hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
