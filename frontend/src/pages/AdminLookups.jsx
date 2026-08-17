import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'

function LookupTable({ type }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [editValue, setEditValue] = useState('')
  const [mergingId, setMergingId] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [confirmingMerge, setConfirmingMerge] = useState(null)

  function refresh() {
    setLoading(true)
    return api
      .fetchAdminLookupEntries(type)
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setEditingId('')
    setMergingId('')
    setConfirmingMerge(null)
    setActionError('')
    setError('')
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  function startEdit(entry) {
    setActionError('')
    setEditingId(entry.id)
    setEditValue(entry.name)
  }

  async function saveEdit(entry) {
    setActionError('')
    setBusy(true)
    try {
      await api.renameAdminLookupEntry(type, entry.id, editValue.trim())
      setEditingId('')
      await refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function startMerge(entry) {
    setActionError('')
    setMergingId(entry.id)
    setMergeTargetId('')
  }

  function requestMergeConfirmation(entry) {
    const target = entries.find((e) => e.id === mergeTargetId)
    if (!target) return
    setConfirmingMerge({ source: entry, target })
  }

  async function confirmMerge() {
    if (!confirmingMerge) return
    setActionError('')
    setBusy(true)
    try {
      await api.mergeAdminLookupEntries(type, confirmingMerge.source.id, confirmingMerge.target.id)
      setConfirmingMerge(null)
      setMergingId('')
      await refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-text-faint">Loading...</p>
  if (error) return <p className="text-sm text-danger">{error}</p>

  return (
    <div className="flex flex-col gap-3">
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {confirmingMerge && (
        <div className="rounded-lg border border-accent bg-surface p-4">
          <p className="text-sm text-text">
            Merge <span className="font-medium">{confirmingMerge.source.name}</span> into{' '}
            <span className="font-medium">{confirmingMerge.target.name}</span>? This will repoint{' '}
            <span className="font-medium">
              {confirmingMerge.source.referenceCount} reference
              {confirmingMerge.source.referenceCount === 1 ? '' : 's'}
            </span>{' '}
            to <span className="font-medium">{confirmingMerge.target.name}</span> and permanently delete{' '}
            <span className="font-medium">{confirmingMerge.source.name}</span>. This cannot be undone.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={confirmMerge}
              className="rounded bg-danger px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Merging...' : 'Confirm merge'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingMerge(null)}
              className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-faint">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">References</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {editingId === entry.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="rounded border border-border-strong bg-bg px-2 py-1 text-text focus:border-accent"
                    />
                  ) : (
                    <>
                      <span className="text-text">{entry.name}</span>
                      {entry.parentName && (
                        <span className="ml-2 text-xs text-text-faint">({entry.parentName})</span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">{entry.referenceCount}</td>
                <td className="px-4 py-3">
                  {editingId === entry.id ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={busy || !editValue.trim()}
                        onClick={() => saveEdit(entry)}
                        className="text-sm text-accent hover:text-accent-hover hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId('')}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : mergingId === entry.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        className="rounded border border-border-strong bg-bg px-2 py-1 text-sm text-text focus:border-accent"
                      >
                        <option value="">Select target...</option>
                        {entries
                          .filter(
                            (e) =>
                              e.id !== entry.id &&
                              (!entry.parentId || e.parentId === entry.parentId),
                          )
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                              {e.parentName ? ` (${e.parentName})` : ''}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!mergeTargetId}
                        onClick={() => requestMergeConfirmation(entry)}
                        className="text-sm text-accent hover:text-accent-hover hover:underline disabled:opacity-50"
                      >
                        Merge
                      </button>
                      <button
                        type="button"
                        onClick={() => setMergingId('')}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        className="text-sm text-accent hover:text-accent-hover hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => startMerge(entry)}
                        className="text-sm text-accent hover:text-accent-hover hover:underline"
                      >
                        Merge into...
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-faint">
                  No entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminLookups() {
  const [types, setTypes] = useState([])
  const [activeType, setActiveType] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchLookupTypes()
      .then((fetched) => {
        setTypes(fetched)
        if (fetched.length > 0) setActiveType(fetched[0].key)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Lookup data</h1>
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {types.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            {types.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveType(t.key)}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  activeType === t.key
                    ? 'bg-accent text-accent-text'
                    : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {activeType && <LookupTable key={activeType} type={activeType} />}
      </div>
    </div>
  )
}

export default AdminLookups
