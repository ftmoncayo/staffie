import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'

function VenueForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [name, setName] = useState(initial?.name || '')
  const [city, setCity] = useState(initial?.city || null)
  const [state, setState] = useState(initial?.state || '')
  const [country, setCountry] = useState(initial?.country || '')
  const [venueType, setVenueType] = useState(initial?.venueType || null)
  const [specialties, setSpecialties] = useState(initial?.specialties || [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const specialtyNames = specialties.map((s) => s.name)

  function handleAddSpecialty(item) {
    setSpecialties((prev) => (prev.some((s) => s.name === item.name) ? prev : [...prev, item]))
  }

  function handleRemoveSpecialty(name) {
    setSpecialties((prev) => prev.filter((s) => s.name !== name))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        name,
        cityId: city?.id || null,
        state,
        country,
        venueTypeId: venueType?.id || null,
        specialtyIds: specialties.map((s) => s.id),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
      {error && <p className="text-sm text-danger">{error}</p>}

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Venue name
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          City (optional)
          <SearchCombobox
            fetchOptions={api.fetchCities}
            onCreate={api.createCity}
            onSelect={setCity}
            initialQuery={city?.name || ''}
            placeholder="Search for a city..."
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Venue type (optional)
          <SearchCombobox
            fetchOptions={api.fetchVenueTypes}
            onCreate={api.createVenueType}
            onSelect={setVenueType}
            initialQuery={venueType?.name || ''}
            placeholder="e.g. Bar, Restaurant, Hotel..."
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          State (optional)
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Country (optional)
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Specialties (optional)</span>
        <SearchCombobox
          fetchOptions={api.fetchVenueSpecialties}
          onCreate={api.createVenueSpecialty}
          onSelect={handleAddSpecialty}
          excludeNames={specialtyNames}
          clearOnSelect
          placeholder="Search or add a specialty..."
        />
        <div className="flex flex-wrap gap-2">
          {specialties.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-sm text-accent"
            >
              {s.name}
              <button
                type="button"
                onClick={() => handleRemoveSpecialty(s.name)}
                className="text-accent/70 hover:text-accent"
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-border-strong px-4 py-2 text-text-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default VenueForm
