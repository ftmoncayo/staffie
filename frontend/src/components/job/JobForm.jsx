import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import Tag from '../Tag'

function JobForm({ initial, onSubmit, onCancel, submitLabel = 'Post job', isEditing = false }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [status, setStatus] = useState(initial?.status || 'OPEN')
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
    setSubmitting(true)
    try {
      await onSubmit({
        title,
        description,
        ...(isEditing ? { status } : {}),
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
        Job title
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

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Desired skills (optional)</span>
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
        <span className="text-sm text-text-muted">Desired knowledge areas (optional)</span>
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

      {isEditing && (
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
      )}

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

export default JobForm
