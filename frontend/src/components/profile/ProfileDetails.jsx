import { useState } from 'react'
import LocationCascade from '../LocationCascade'

function rightToWorkLabel(countryName) {
  return countryName ? `Eligible to work in ${countryName}` : 'Eligible to work here'
}

function locationString(profile) {
  return (
    [profile.suburb?.name, profile.city?.name, profile.city?.state?.name, profile.city?.state?.country?.name]
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function ProfileDetails({ profile, onSave }) {
  const [editing, setEditing] = useState(!profile)
  const [firstName, setFirstName] = useState(profile?.firstName || '')
  const [lastName, setLastName] = useState(profile?.lastName || '')
  const [country, setCountry] = useState(profile?.city?.state?.country || null)
  const [state, setState] = useState(profile?.city?.state || null)
  const [city, setCity] = useState(profile?.city || null)
  const [suburb, setSuburb] = useState(profile?.suburb || null)
  const [professionalTitle, setProfessionalTitle] = useState(profile?.professionalTitle || '')
  const [rightToWork, setRightToWork] = useState(profile?.rightToWork ?? false)
  const [culturalIdentity, setCulturalIdentity] = useState(profile?.culturalIdentity || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleCountryChange(newCountry) {
    setCountry(newCountry)
    setState(null)
    setCity(null)
    setSuburb(null)
  }

  function handleStateChange(newState) {
    setState(newState)
    setCity(null)
    setSuburb(null)
  }

  function handleCityChange(newCity) {
    setCity(newCity)
    setSuburb(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSave({
        firstName,
        lastName,
        cityId: city?.id || null,
        suburbId: suburb?.id || null,
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
          <h2 className="text-xl font-semibold text-text">ID Card</h2>
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
            <dt className="text-sm text-text-faint">Location</dt>
            <dd className="text-text">{locationString(profile)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-faint">Professional title</dt>
            <dd className="text-text">{profile.professionalTitle}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-faint">{rightToWorkLabel(profile.city?.state?.country?.name)}</dt>
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
        {profile ? 'Edit ID Card' : 'Complete your profile'}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LocationCascade
          country={country}
          state={state}
          city={city}
          suburb={suburb}
          onCountryChange={handleCountryChange}
          onStateChange={handleStateChange}
          onCityChange={handleCityChange}
          onSuburbChange={setSuburb}
          suburbLabel="Suburb (optional)"
        />
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

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={rightToWork}
          onChange={(e) => setRightToWork(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        {rightToWorkLabel(country?.name)}
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
