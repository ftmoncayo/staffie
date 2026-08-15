import { useState } from 'react'

function ConnectionButton({ status, onConnect, onAccept, onDecline }) {
  const [submitting, setSubmitting] = useState(false)

  async function run(action) {
    setSubmitting(true)
    try {
      await action()
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'connected') {
    return (
      <span className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted">
        Connected
      </span>
    )
  }

  if (status === 'pending-sent') {
    return (
      <span className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted">
        Request sent
      </span>
    )
  }

  if (status === 'pending-received') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => run(onAccept)}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => run(onDecline)}
          className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={submitting}
      onClick={() => run(onConnect)}
      className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
    >
      Connect
    </button>
  )
}

export default ConnectionButton
