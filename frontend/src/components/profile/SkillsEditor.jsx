import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import Tag from '../Tag'

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
          Complete your ID Card above before adding skills.
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
          <Tag
            key={skill.id}
            level={skill.level}
            onRemove={() => handleRemove(skill.name)}
            removeDisabled={removing === skill.name}
            removeLabel={`Remove ${skill.name}`}
          >
            {skill.name}
          </Tag>
        ))}
        {profile && skills.length === 0 && (
          <p className="text-sm text-text-faint">No skills added yet.</p>
        )}
      </div>
    </div>
  )
}

export default SkillsEditor
