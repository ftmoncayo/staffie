import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import VenuePicker from '../VenuePicker'
import Tag from '../Tag'

function toInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// `initialLocationVenue` prefills the location venue from the owner venue
// itself at creation time only — once set, the location lives on the Event
// itself and is independently editable thereafter (see `initial`, used
// instead when editing an existing event).
function EventForm({ initial, initialLocationVenue, onSubmit, onCancel, submitLabel = 'Create event' }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [category, setCategory] = useState(initial?.category || null)
  const [startAt, setStartAt] = useState(toInputValue(initial?.startAt))
  const [endAt, setEndAt] = useState(toInputValue(initial?.endAt))
  const [locationVenue, setLocationVenue] = useState(initial?.locationVenue || initialLocationVenue || null)
  const [skills, setSkills] = useState(initial?.skills || [])
  const [knowledgeAreas, setKnowledgeAreas] = useState(initial?.knowledgeAreas || [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const skillNames = skills.map((s) => s.name)
  const knowledgeAreaNames = knowledgeAreas.map((k) => k.name)

  function handleAddSkill(item) {
    setSkills((prev) => (prev.some((s) => s.name === item.name) ? prev : [...prev, item]))
  }

  function handleRemoveSkill(name) {
    setSkills((prev) => prev.filter((s) => s.name !== name))
  }

  function handleAddKnowledgeArea(item) {
    setKnowledgeAreas((prev) => (prev.some((k) => k.name === item.name) ? prev : [...prev, item]))
  }

  function handleRemoveKnowledgeArea(name) {
    setKnowledgeAreas((prev) => prev.filter((k) => k.name !== name))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!category) {
      setError('Category is required')
      return
    }
    if (!startAt) {
      setError('Start date/time is required')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        title,
        description,
        categoryId: category.id,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        locationVenueId: locationVenue?.id || null,
        skillIds: skills.map((s) => s.id),
        knowledgeAreaIds: knowledgeAreas.map((k) => k.id),
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
        Event title
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Description
        <textarea
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Category
        <SearchCombobox
          fetchOptions={api.fetchEventCategories}
          onCreate={api.createEventCategory}
          onSelect={setCategory}
          initialQuery={category?.name || ''}
          placeholder="e.g. Training, Tasting, Social..."
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Starts
          <input
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Ends (optional)
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Location (optional)
        <VenuePicker
          onSelect={setLocationVenue}
          allowCreate={false}
          initialQuery={locationVenue?.name || ''}
          placeholder="Search for a venue..."
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Skills developed (optional)</span>
        <SearchCombobox
          fetchOptions={api.fetchSkillOptions}
          onCreate={api.createSkill}
          onSelect={handleAddSkill}
          excludeNames={skillNames}
          clearOnSelect
          placeholder="Search or add a skill..."
        />
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <Tag key={s.id} onRemove={() => handleRemoveSkill(s.name)} removeLabel={`Remove ${s.name}`}>
              {s.name}
            </Tag>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Knowledge developed (optional)</span>
        <SearchCombobox
          fetchOptions={api.fetchKnowledgeAreaOptions}
          onCreate={api.createKnowledgeArea}
          onSelect={handleAddKnowledgeArea}
          excludeNames={knowledgeAreaNames}
          clearOnSelect
          placeholder="Search or add a knowledge area..."
        />
        <div className="flex flex-wrap gap-2">
          {knowledgeAreas.map((k) => (
            <Tag key={k.id} onRemove={() => handleRemoveKnowledgeArea(k.name)} removeLabel={`Remove ${k.name}`}>
              {k.name}
            </Tag>
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

export default EventForm
