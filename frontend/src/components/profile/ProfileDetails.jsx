import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'

function ProfileDetails({ profile, onSave }) {
  const [editing, setEditing] = useState(!profile)
  const [firstName, setFirstName] = useState(profile?.firstName || '')
  const [lastName, setLastName] = useState(profile?.lastName || '')
  const [city, setCity] = useState(profile?.city || null)
  const [professionalTitle, setProfessionalTitle] = useState(profile?.professionalTitle || '')
  const [rightToWork, setRightToWork] = useState(profile?.rightToWork ?? false)
  const [culturalIdentity, setCulturalIdentity] = useState(profile?.culturalIdentity || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSave({
        firstName,
        lastName,
        cityId: city?.id || null,
        professionalTitle,
        rightToWork,
        culturalIdentity,
      })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!editing) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-text">Profile details</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-faint">Name</dt>
            <dd className="text-text">
              {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-faint">Professional title</dt>
            <dd className="text-text">{profile.professionalTitle}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-faint">City</dt>
            <dd className="text-text">{profile.city?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-faint">Right to work</dt>
            <dd className="text-text">{profile.rightToWork ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-faint">Cultural identity / background</dt>
            <dd className="text-text">{profile.culturalIdentity || '—'}</dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">
        {profile ? 'Edit profile details' : 'Complete your profile'}
      </h2>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          First name
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Last name (optional)
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Professional title
        <input
          type="text"
          required
          value={professionalTitle}
          onChange={(e) => setProfessionalTitle(e.target.value)}
          className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        City (e.g. Melbourne, Sydney, London)
        <SearchCombobox
          fetchOptions={api.fetchCities}
          onCreate={api.createCity}
          onSelect={setCity}
          initialQuery={city?.name || ''}
          placeholder="Search for a city..."
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={rightToWork}
          onChange={(e) => setRightToWork(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        I have the right to work
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Cultural identity / background (optional)
        <textarea
          value={culturalIdentity}
          onChange={(e) => setCulturalIdentity(e.target.value)}
          rows={3}
          className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
        {profile && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-border-strong px-4 py-2 text-text-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default ProfileDetails
