import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'

function KnowledgeAreaEditor({ profile, onAdd, onRemove }) {
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState('')

  const knowledgeAreas = profile?.knowledgeAreas || []
  const selectedNames = knowledgeAreas.map((k) => k.name)

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
      <h2 className="text-xl font-semibold text-text">Knowledge Bank</h2>
      <p className="mt-1 text-sm text-text-faint">
        Informal know-how, e.g. "Japanese Whiskey," "Wine," "Beer Brewing."
      </p>
      {!profile && (
        <p className="mt-2 text-sm text-text-faint">
          Complete your profile details above before adding knowledge areas.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {profile && (
        <div className="mt-4">
          <SearchCombobox
            fetchOptions={api.fetchKnowledgeAreaOptions}
            onCreate={async (name) => ({ id: name, name })}
            onSelect={handleSelect}
            excludeNames={selectedNames}
            clearOnSelect
            placeholder="Search or add a knowledge area..."
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {knowledgeAreas.map((area) => (
          <span
            key={area.id}
            className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-sm text-accent"
          >
            {area.name}
            <button
              type="button"
              disabled={removing === area.name}
              onClick={() => handleRemove(area.name)}
              className="text-accent/70 hover:text-accent disabled:opacity-50"
              aria-label={`Remove ${area.name}`}
            >
              ×
            </button>
          </span>
        ))}
        {profile && knowledgeAreas.length === 0 && (
          <p className="text-sm text-text-faint">No knowledge areas added yet.</p>
        )}
      </div>
    </div>
  )
}

export default KnowledgeAreaEditor
