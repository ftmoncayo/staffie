import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'

function SkillsEditor({ profile, onAdd, onRemove }) {
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState('')

  const skills = profile?.skills || []
  const selectedNames = skills.map((s) => s.name)

  async function handleSelect(item) {
    setError('')
    try {
      await onAdd(item.name)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemove(name) {
    setError('')
    setRemoving(name)
    try {
      await onRemove(name)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving('')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Skills</h2>
      {!profile && (
        <p className="mt-2 text-sm text-text-faint">
          Complete your profile details above before adding skills.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {profile && (
        <div className="mt-4">
          <SearchCombobox
            fetchOptions={api.fetchSkillOptions}
            onCreate={async (name) => ({ id: name, name })}
            onSelect={handleSelect}
            excludeNames={selectedNames}
            clearOnSelect
            placeholder="Search or add a skill..."
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-sm text-accent"
          >
            {skill.name}
            <button
              type="button"
              disabled={removing === skill.name}
              onClick={() => handleRemove(skill.name)}
              className="text-accent/70 hover:text-accent disabled:opacity-50"
              aria-label={`Remove ${skill.name}`}
            >
              ×
            </button>
          </span>
        ))}
        {profile && skills.length === 0 && (
          <p className="text-sm text-text-faint">No skills added yet.</p>
        )}
      </div>
    </div>
  )
}

export default SkillsEditor
