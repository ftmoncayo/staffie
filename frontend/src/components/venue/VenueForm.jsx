import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'

function VenueForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [name, setName] = useState(initial?.name || '')
  const [city, setCity] = useState(initial?.city || null)
  const [state, setState] = useState(initial?.state || '')
  const [country, setCountry] = useState(initial?.country || '')
  const [venueType, setVenueType] = useState(initial?.venueType || '')
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
        venueType,
        specialtyIds: specialties.map((s) => s.id),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Venue name
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          City (optional)
          <SearchCombobox
            fetchOptions={api.fetchCities}
            onCreate={api.createCity}
            onSelect={setCity}
            initialQuery={city?.name || ''}
            placeholder="Search for a city..."
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Venue type (optional)
          <SearchCombobox
            fetchOptions={api.fetchVenueTypeOptions}
            onCreate={async (typedName) => ({ id: typedName, name: typedName })}
            onSelect={(item) => setVenueType(item.name)}
            initialQuery={venueType}
            placeholder="e.g. Bar, Restaurant, Hotel..."
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          State (optional)
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Country (optional)
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-700">Specialties (optional)</span>
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
              className="flex items-center gap-2 rounded-full border border-blue-600 bg-blue-600 px-4 py-1.5 text-sm text-white"
            >
              {s.name}
              <button
                type="button"
                onClick={() => handleRemoveSpecialty(s.name)}
                className="text-white/80 hover:text-white"
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
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default VenueForm
