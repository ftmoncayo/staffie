import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import RichTextEditor from '../RichTextEditor'

function BusinessForm({ initial, onSubmit, onCancel, submitLabel = 'Save', standalone = true, isEditing = false }) {
  const [name, setName] = useState(initial?.name || '')
  const [category, setCategory] = useState(initial?.category || null)
  const [about, setAbout] = useState(initial?.about || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e?.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = { name, categoryId: category?.id || null }
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
