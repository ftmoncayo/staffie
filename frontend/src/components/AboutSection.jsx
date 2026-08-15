import { useState } from 'react'
import RichTextEditor from './RichTextEditor'
import RichTextContent from './RichTextContent'

function AboutSection({ about, canEdit, onSave, emptyMessage = 'Nothing here yet.' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(about || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function startEditing() {
    setDraft(about || '')
    setError('')
    setEditing(true)
  }

  async function handleSave() {
    setError('')
    setSubmitting(true)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">About</h2>
        {canEdit && !editing && (
          <button
            onClick={startEditing}
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {editing ? (
        <div className="mt-4 flex flex-col gap-3">
          <RichTextEditor content={draft} onChange={setDraft} />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-border-strong px-4 py-2 text-sm text-text-muted hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : about ? (
        <div className="mt-4">
          <RichTextContent html={about} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-faint">{emptyMessage}</p>
      )}
    </div>
  )
}

export default AboutSection
