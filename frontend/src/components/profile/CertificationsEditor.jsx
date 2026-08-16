import { useState } from 'react'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'
import Modal from '../Modal'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function CertificationForm({ initial, onSubmit, onCancel }) {
  const [certificationType, setCertificationType] = useState(initial?.certificationType || null)
  const [issueDate, setIssueDate] = useState(initial?.issueDate || '')
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!certificationType) {
      setError('Certification type is required')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ certificationTypeId: certificationType.id, issueDate, expiryDate })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Name
          <SearchCombobox
            fetchOptions={api.fetchCertificationTypes}
            onCreate={api.createCertificationType}
            onSelect={setCertificationType}
            initialQuery={certificationType?.name || ''}
            placeholder="Search or add a certification..."
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Issue date
          <input
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Expiry date (optional)
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border-strong px-4 py-2 text-sm text-text-muted hover:bg-surface-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function CertificationsEditor({ profile, certifications, onCreate, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const editingCert = certifications.find((cert) => cert.id === editingId) || null

  async function handleDelete(id) {
    setError('')
    setDeletingId(id)
    try {
      await onDelete(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Certifications</h2>
        {profile && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            + Add certification
          </button>
        )}
      </div>

      {!profile && (
        <p className="mt-2 text-sm text-text-faint">
          Complete your profile details above before adding certifications.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {certifications.map((cert) => (
          <div key={cert.id} className="flex items-start justify-between rounded border border-border p-4">
            <div>
              <p className="font-medium text-text">{cert.certificationType?.name}</p>
              <p className="text-sm text-text-faint">
                Issued {formatDate(cert.issueDate)}
                {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ''}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditingId(cert.id)} className="text-accent hover:text-accent-hover hover:underline">
                Edit
              </button>
              <button
                onClick={() => handleDelete(cert.id)}
                disabled={deletingId === cert.id}
                className="text-danger hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {certifications.length === 0 && profile && (
          <p className="text-sm text-text-faint">No certifications added yet.</p>
        )}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add certification">
        <CertificationForm
          onCancel={() => setAdding(false)}
          onSubmit={async (data) => {
            await onCreate(data)
            setAdding(false)
          }}
        />
      </Modal>

      <Modal open={editingId != null} onClose={() => setEditingId(null)} title="Edit certification">
        {editingCert && (
          <CertificationForm
            initial={{
              certificationType: editingCert.certificationType,
              issueDate: formatDate(editingCert.issueDate),
              expiryDate: formatDate(editingCert.expiryDate),
            }}
            onCancel={() => setEditingId(null)}
            onSubmit={async (data) => {
              await onUpdate(editingCert.id, data)
              setEditingId(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default CertificationsEditor
