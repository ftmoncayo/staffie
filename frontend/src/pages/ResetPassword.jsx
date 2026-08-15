import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../lib/api'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      navigate('/login', { state: { message: 'Your password has been reset. You can now log in.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface p-8"
      >
        <h1 className="text-2xl font-semibold text-text">Reset password</h1>

        {!token && (
          <p className="text-sm text-danger">
            This link is missing a reset token. Please use the link from your email.
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || !token}
          className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Resetting...' : 'Reset password'}
        </button>

        <p className="text-sm text-text-muted">
          <Link to="/login" className="text-accent hover:text-accent-hover hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default ResetPassword
