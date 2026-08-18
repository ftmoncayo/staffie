import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import Tag from '../Tag'
import TagLevelInfo from '../TagLevelInfo'

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
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-text">Skills</h2>
        <TagLevelInfo />
      </div>
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

      {skills.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-faint">
                <th className="px-4 py-2 font-medium">Skill</th>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Verified by</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text">{skill.name}</td>
                  <td className="px-4 py-2">
                    <Tag level={skill.level}>Level {skill.level}</Tag>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{skill.verifiedBy}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      disabled={removing === skill.name}
                      onClick={() => handleRemove(skill.name)}
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
      {profile && skills.length === 0 && (
        <p className="mt-4 text-sm text-text-faint">No skills added yet.</p>
      )}
    </div>
  )
}

export default SkillsEditor
