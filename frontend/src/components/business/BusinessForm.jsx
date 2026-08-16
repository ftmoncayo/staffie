import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import RichTextEditor from '../RichTextEditor'
import Tag from '../Tag'

const LOCATION_SCOPE_OPTIONS = [
  { value: 'SPECIFIC_CITIES', label: 'Specific cities' },
  { value: 'COUNTRY', label: 'Entire country' },
  { value: 'GLOBAL', label: 'Global' },
]

function BusinessForm({ initial, onSubmit, onCancel, submitLabel = 'Save', standalone = true, isEditing = false }) {
  const [name, setName] = useState(initial?.name || '')
  const [category, setCategory] = useState(initial?.category || null)
  const [about, setAbout] = useState(initial?.about || '')
  const [locationScope, setLocationScope] = useState(initial?.locationScope || 'SPECIFIC_CITIES')
  const [cities, setCities] = useState((initial?.locations || []).map((l) => l.city))
  const [locationCountry, setLocationCountry] = useState(initial?.country || null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleAddCity(item) {
    setCities((prev) => (prev.some((c) => c.id === item.id) ? prev : [...prev, item]))
  }

  function handleRemoveCity(id) {
    setCities((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        name,
        categoryId: category?.id || null,
        locationScope,
        cityIds: locationScope === 'SPECIFIC_CITIES' ? cities.map((c) => c.id) : [],
        countryId: locationScope === 'COUNTRY' ? locationCountry?.id || null : null,
      }
      if (!isEditing) payload.about = about
      await onSubmit(payload)
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
        Business name
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Category (optional)
        <SearchCombobox
          fetchOptions={api.fetchBusinessCategories}
          onCreate={api.createBusinessCategory}
          onSelect={setCategory}
          initialQuery={category?.name || ''}
          placeholder="e.g. Spirits, Supplier, POS/Tech..."
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Where does this business operate?</span>
        <div className="flex flex-wrap gap-4 text-sm text-text">
          {LOCATION_SCOPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="locationScope"
                value={option.value}
                checked={locationScope === option.value}
                onChange={() => setLocationScope(option.value)}
                className="accent-accent"
              />
              {option.label}
            </label>
          ))}
        </div>

        {locationScope === 'SPECIFIC_CITIES' && (
          <div className="flex flex-col gap-2">
            <SearchCombobox
              fetchOptions={api.fetchCities}
              onSelect={handleAddCity}
              allowCreate={false}
              clearOnSelect
              excludeNames={cities.map((c) => c.name)}
              placeholder="Search for a city..."
            />
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <Tag key={c.id} onRemove={() => handleRemoveCity(c.id)} removeLabel={`Remove ${c.name}`}>
                  {c.name}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {locationScope === 'COUNTRY' && (
          <SearchCombobox
            fetchOptions={api.fetchCountries}
            onCreate={api.createCountry}
            onSelect={setLocationCountry}
            initialQuery={locationCountry?.name || ''}
            placeholder="Search for a country..."
          />
        )}

        {locationScope === 'GLOBAL' && (
          <p className="text-sm text-text-faint">No location needed — this business operates globally.</p>
        )}
      </div>

      {!isEditing && (
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          About (optional)
          <RichTextEditor content={about} onChange={setAbout} />
        </label>
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

export default BusinessForm
