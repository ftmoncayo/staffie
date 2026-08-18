import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import Tag from '../Tag'
import TagLevelInfo from '../TagLevelInfo'
import { levelLabel } from '../../lib/levelLabel'

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
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-text">Knowledge Bank</h2>
        <TagLevelInfo />
      </div>
      <p className="mt-1 text-sm text-text-faint">
        Informal know-how, e.g. "Japanese Whiskey," "Wine," "Beer Brewing."
      </p>
      {!profile && (
        <p className="mt-2 text-sm text-text-faint">
          Complete your ID Card above before adding knowledge areas.
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

      {knowledgeAreas.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint">
                <th className="px-4 py-2 font-medium">Knowledge area</th>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Verified by</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {knowledgeAreas.map((area) => (
                <tr key={area.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text">{area.name}</td>
                  <td className="px-4 py-2">
                    <Tag level={area.level}>{levelLabel(area.level)}</Tag>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{area.verifiedBy}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      disabled={removing === area.name}
                      onClick={() => handleRemove(area.name)}
                      className="text-sm text-text-muted hover:text-danger disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {profile && knowledgeAreas.length === 0 && (
        <p className="mt-4 text-sm text-text-faint">No knowledge areas added yet.</p>
      )}
    </div>
  )
}

export default KnowledgeAreaEditor
