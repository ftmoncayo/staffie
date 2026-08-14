import { useState } from 'react'

const emptyForm = { name: '', issueDate: '', expiryDate: '' }

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function CertificationForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Name
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Issue date
          <input
            type="date"
            required
            value={form.issueDate}
            onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Expiry date (optional)
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Certifications</h2>
        {profile && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add certification
          </button>
        )}
      </div>

      {!profile && (
        <p className="mt-2 text-sm text-gray-500">
          Complete your profile details above before adding certifications.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {certifications.map((cert) =>
          editingId === cert.id ? (
            <CertificationForm
              key={cert.id}
              initial={{
                name: cert.name,
                issueDate: formatDate(cert.issueDate),
                expiryDate: formatDate(cert.expiryDate),
              }}
              onCancel={() => setEditingId(null)}
              onSubmit={async (data) => {
                await onUpdate(cert.id, data)
                setEditingId(null)
              }}
            />
          ) : (
            <div key={cert.id} className="flex items-start justify-between rounded border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">{cert.name}</p>
                <p className="text-sm text-gray-500">
                  Issued {formatDate(cert.issueDate)}
                  {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ''}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => setEditingId(cert.id)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cert.id)}
                  disabled={deletingId === cert.id}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}

        {adding && (
          <CertificationForm
            onCancel={() => setAdding(false)}
            onSubmit={async (data) => {
              await onCreate(data)
              setAdding(false)
            }}
          />
        )}

        {certifications.length === 0 && !adding && profile && (
          <p className="text-sm text-gray-500">No certifications added yet.</p>
        )}
      </div>
    </div>
  )
}

export default CertificationsEditor
