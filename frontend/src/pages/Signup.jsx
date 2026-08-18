import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [requireCode, setRequireCode] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  useEffect(() => {
    api
      .fetchRegistrationSettings()
      .then((data) => setRequireCode(data.requireCode))
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signup(email, password, inviteToken, code)
      navigate('/home')
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
        <h1 className="text-2xl font-semibold text-text">Sign up</h1>

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
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>

        {requireCode && (
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Code
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
            />
          </label>
        )}

        {requireCode && (
          <p className="text-sm text-text-muted">
            Don't have a code?{' '}
            <Link to="/waitlist" className="text-accent hover:text-accent-hover hover:underline">
              Join the waitlist for the next release
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Signing up...' : 'Sign up'}
        </button>

        <p className="text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Signup
