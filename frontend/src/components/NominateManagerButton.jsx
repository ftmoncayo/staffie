import { useState } from 'react'

function NominateManagerButton({ label, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) {
      setError('Please include a message with your contact details.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(message.trim())
      setSent(true)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return <p className="text-sm text-text-faint">Request sent — pending review.</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
      >
        {label}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell an admin why you should manage this, and include contact details (e.g. phone or email)."
        rows={3}
        className="rounded border border-border-strong bg-bg px-3 py-2 text-sm text-text focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send request'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default NominateManagerButton
