import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import LocationCascade from '../LocationCascade'
import Tag from '../Tag'

const DEFAULT_COUNTRY_NAME = 'Australia'
const DEFAULT_STATE_NAME = 'Victoria'
const DEFAULT_CITY_NAME = 'Melbourne'

function VenueForm({ initial, onSubmit, onCancel, submitLabel = 'Save', standalone = true, isEditing = false }) {
  const [name, setName] = useState(initial?.name || '')
  const [country, setCountry] = useState(initial?.city?.state?.country || null)
  const [state, setState] = useState(initial?.city?.state || null)
  const [city, setCity] = useState(initial?.city || null)
  const [suburb, setSuburb] = useState(initial?.suburb || null)
  const [venueType, setVenueType] = useState(initial?.venueType || null)
  const [specialties, setSpecialties] = useState(initial?.specialties || [])
  const [isManager, setIsManager] = useState(false)
  const [managerEmail, setManagerEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pre-select Australia / Victoria / Melbourne on a fresh create — each still
  // changeable, and skipped entirely when editing an existing venue or a
  // location has already been set (e.g. by the caller). Suburb is left empty
  // even on create, since there's no single reasonable default suburb.
  useEffect(() => {
    if (isEditing || city) return
    let cancelled = false
    async function loadDefaults() {
      const countries = await api.fetchCountries(DEFAULT_COUNTRY_NAME)
      const defaultCountry = countries.find((c) => c.name === DEFAULT_COUNTRY_NAME)
      if (cancelled || !defaultCountry) return
      setCountry(defaultCountry)

      const states = await api.fetchStates(defaultCountry.id, DEFAULT_STATE_NAME)
      const defaultState = states.find((s) => s.name === DEFAULT_STATE_NAME)
      if (cancelled || !defaultState) return
      setState(defaultState)

      const cities = await api.fetchCitiesByState(defaultState.id, DEFAULT_CITY_NAME)
      const defaultCity = cities.find((c) => c.name === DEFAULT_CITY_NAME)
      if (!cancelled && defaultCity) setCity(defaultCity)
    }
    loadDefaults()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const specialtyNames = specialties.map((s) => s.name)

  function handleAddSpecialty(item) {
    setSpecialties((prev) => (prev.some((s) => s.name === item.name) ? prev : [...prev, item]))
  }

  function handleRemoveSpecialty(name) {
    setSpecialties((prev) => prev.filter((s) => s.name !== name))
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    setError('')
    if (!venueType) {
      setError('Venue type is required')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name,
        cityId: city?.id || null,
        suburbId: suburb?.id || null,
        venueTypeId: venueType.id,
        specialtyIds: specialties.map((s) => s.id),
        ...(isEditing ? {} : { isManager, managerEmail: isManager ? '' : managerEmail }),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const Wrapper = standalone ? 'form' : 'div'

  return (
    <Wrapper
      {...(standalone ? { onSubmit: handleSubmit } : {})}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
    >
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
        <LocationCascade
          country={country}
          state={state}
          city={city}
          suburb={suburb}
          onCountryChange={handleCountryChange}
          onStateChange={handleStateChange}
          onCityChange={handleCityChange}
          onSuburbChange={setSuburb}
        />

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Venue type
          <SearchCombobox
            fetchOptions={api.fetchVenueTypes}
            onCreate={api.createVenueType}
            onSelect={setVenueType}
            initialQuery={venueType?.name || ''}
            placeholder="e.g. Bar, Restaurant, Hotel..."
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
            <Tag
              key={s.id}
              onRemove={() => handleRemoveSpecialty(s.name)}
              removeLabel={`Remove ${s.name}`}
            >
              {s.name}
            </Tag>
          ))}
        </div>
      </div>

      {!isEditing && (
        <div className="flex flex-col gap-2 rounded border border-border p-4">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={isManager}
              onChange={(e) => setIsManager(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            I am the manager of this venue
          </label>
          {!isManager && (
            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Manager's email (optional)
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="We'll let them know they can claim this page"
                className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
              />
            </label>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type={standalone ? 'submit' : 'button'}
          onClick={standalone ? undefined : handleSubmit}
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
    </Wrapper>
  )
}

export default VenueForm
