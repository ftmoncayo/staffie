import { useState } from 'react'

const PREDEFINED_SKILLS = [
  'Bartending',
  'Barista',
  'Front of House',
  'Kitchen Hand',
  'Waitstaff',
  'Management',
]

function SkillsEditor({ profile, onAdd, onRemove }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState('')

  const selected = new Set((profile?.skills || []).map((s) => s.name))

  async function toggle(name) {
    setError('')
    setPending(name)
    try {
      if (selected.has(name)) {
        await onRemove(name)
      } else {
        await onAdd(name)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPending('')
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
      {!profile && (
        <p className="mt-2 text-sm text-gray-500">
          Complete your profile details above before adding skills.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {PREDEFINED_SKILLS.map((name) => {
          const isSelected = selected.has(name)
          return (
            <button
              key={name}
              type="button"
              disabled={!profile || pending === name}
              onClick={() => toggle(name)}
              className={`rounded-full border px-4 py-1.5 text-sm disabled:opacity-50 ${
                isSelected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SkillsEditor
