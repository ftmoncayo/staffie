import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'

function recipientName(recipient) {
  const name = [recipient?.profile?.firstName, recipient?.profile?.lastName].filter(Boolean).join(' ')
  return name || recipient?.email || 'Someone'
}

function groupItems(profile) {
  const skills = (profile?.skills || []).map((s) => ({ ...s, itemType: 'SKILL' }))
  const knowledgeAreas = (profile?.knowledgeAreas || []).map((k) => ({ ...k, itemType: 'KNOWLEDGE_AREA' }))
  const all = [...skills, ...knowledgeAreas]
  return {
    // Upskilling sits below Level 2 — it isn't a peer/manager Endorsement,
    // so it belongs in "not yet endorsed" alongside plain self-declared
    // items, not in the peer-only bucket.
    unendorsed: all.filter((i) => i.level === 1 || i.level === 'UPSKILLING'),
    peerOnly: all.filter((i) => i.level === 2),
  }
}

function itemKey(item) {
  return `${item.itemType}:${item.id}`
}

function RequestEndorsementsPanel({ profile, onClose }) {
  const { unendorsed, peerOnly } = groupItems(profile)
  const allItems = [...unendorsed, ...peerOnly]

  const [selected, setSelected] = useState(() => new Set(allItems.map(itemKey)))
  const [scope, setScope] = useState('BOTH')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [recipients, setRecipients] = useState(null)

  function toggle(item) {
    setSelected((prev) => {
      const next = new Set(prev)
      const key = itemKey(item)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setRecipients(null)
    const items = allItems
      .filter((item) => selected.has(itemKey(item)))
      .map((item) => ({ itemId: item.id, itemType: item.itemType }))
    if (items.length === 0) {
      setError('Select at least one item')
      return
    }
    setSubmitting(true)
    try {
      const result = await api.requestEndorsements(items, scope)
      setRecipients(result.recipients)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (allItems.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-bg p-4">
        <p className="text-sm text-text-faint">
          Everything you've added already has a manager endorsement — nothing left to request.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-bg p-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {recipients && (
        <p className="text-sm text-success">
          Requests sent to{' '}
          {recipients.map((recipient, index) => (
            <span key={recipient.id}>
              <Link to={`/profile/${recipient.id}`} className="font-medium hover:underline">
                {recipientName(recipient)}
              </Link>
              {index < recipients.length - 1 ? ', ' : ''}
            </span>
          ))}
          .
        </p>
      )}

      {unendorsed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-faint">Not yet endorsed</h3>
          <div className="mt-2 flex flex-col gap-1">
            {unendorsed.map((item) => (
              <label key={itemKey(item)} className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={selected.has(itemKey(item))} onChange={() => toggle(item)} />
                {item.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {peerOnly.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-faint">Endorsed by peers only</h3>
          <div className="mt-2 flex flex-col gap-1">
            {peerOnly.map((item) => (
              <label key={itemKey(item)} className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={selected.has(itemKey(item))} onChange={() => toggle(item)} />
                {item.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-text-faint">Request from</h3>
        <div className="mt-2 flex gap-4 text-sm text-text">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="endorsement-scope"
              checked={scope === 'PEERS'}
              onChange={() => setScope('PEERS')}
            />
            Colleagues
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="endorsement-scope"
              checked={scope === 'MANAGERS'}
              onChange={() => setScope('MANAGERS')}
            />
            Managers
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="endorsement-scope"
              checked={scope === 'BOTH'}
              onChange={() => setScope('BOTH')}
            />
            Both
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send requests'}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-text-muted hover:text-text">
          Close
        </button>
      </div>
    </form>
  )
}

export default RequestEndorsementsPanel
