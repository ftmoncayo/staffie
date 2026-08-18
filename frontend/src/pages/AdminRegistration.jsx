import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function AdminRegistration() {
  const [settings, setSettings] = useState(null)
  const [codeDraft, setCodeDraft] = useState('')
  const [waitlist, setWaitlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.fetchAdminRegistrationSettings(), api.fetchWaitlist()])
      .then(([s, w]) => {
        setSettings(s)
        setCodeDraft(s.currentCode || '')
        setWaitlist(w)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleRequireCode(e) {
    setError('')
    setSaving(true)
    try {
      const updated = await api.updateAdminRegistrationSettings({ requireCode: e.target.checked })
      setSettings(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCode(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updated = await api.updateAdminRegistrationSettings({ currentCode: codeDraft })
      setSettings(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Registration</h1>
          <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to home
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={settings.requireCode}
              disabled={saving}
              onChange={handleToggleRequireCode}
              className="h-4 w-4 accent-accent disabled:opacity-50"
            />
            Require a registration code to sign up
          </label>

          <form onSubmit={handleSaveCode} className="flex items-end gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm text-text-muted">
              Current code
              <input
                type="text"
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                placeholder="e.g. STAFFIE2026"
                className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              Save
            </button>
          </form>
          <p className="text-sm text-text-faint">
            Saving a new code immediately replaces the old one — only this current value is ever valid.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text">Waitlist</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-faint">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Venue</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text">{entry.email}</td>
                    <td className="px-4 py-3 text-text-muted">{entry.name || '—'}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {entry.venue ? (
                        <Link
                          to={`/venues/${entry.venue.id}`}
                          className="text-accent hover:text-accent-hover hover:underline"
                        >
                          {entry.venue.name}
                        </Link>
                      ) : (
                        entry.otherVenueName || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
                {waitlist.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-text-faint">
                      No one on the waitlist yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminRegistration
