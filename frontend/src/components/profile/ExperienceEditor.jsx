import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'
import SearchCombobox from '../SearchCombobox'

const emptyForm = { venue: null, roleTitle: '', startDate: '', endDate: '', isCurrent: false }

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function ExperienceForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.venue) {
      setError('Venue is required')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ ...form, venueId: form.venue.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Venue
          <SearchCombobox
            fetchOptions={api.fetchVenueOptions}
            onCreate={(name) => api.createVenue({ name })}
            onSelect={(venue) => setForm({ ...form, venue })}
            initialQuery={form.venue?.name || ''}
            placeholder="Search or add a venue..."
          />
          <Link to="/venues/new" className="text-xs text-blue-600 hover:underline">
            + Create a full venue profile
          </Link>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Role title
          <input
            type="text"
            required
            value={form.roleTitle}
            onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Start date
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          End date
          <input
            type="date"
            disabled={form.isCurrent}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.isCurrent}
          onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: '' })}
          className="h-4 w-4"
        />
        I currently work here
      </label>

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

function ExperienceEditor({ profile, experiences, onCreate, onUpdate, onDelete }) {
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
        <h2 className="text-xl font-semibold text-gray-900">Experience</h2>
        {profile && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add experience
          </button>
        )}
      </div>

      {!profile && (
        <p className="mt-2 text-sm text-gray-500">
          Complete your profile details above before adding experience.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {experiences.map((exp) =>
          editingId === exp.id ? (
            <ExperienceForm
              key={exp.id}
              initial={{
                venue: exp.venue,
                roleTitle: exp.roleTitle,
                startDate: formatDate(exp.startDate),
                endDate: formatDate(exp.endDate),
                isCurrent: exp.isCurrent,
              }}
              onCancel={() => setEditingId(null)}
              onSubmit={async (data) => {
                await onUpdate(exp.id, data)
                setEditingId(null)
              }}
            />
          ) : (
            <div key={exp.id} className="flex items-start justify-between rounded border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">{exp.roleTitle}</p>
                <Link to={`/venues/${exp.venue.id}`} className="text-sm text-blue-600 hover:underline">
                  {exp.venue.name}
                </Link>
                <p className="text-sm text-gray-500">
                  {formatDate(exp.startDate)} – {exp.isCurrent ? 'Current' : formatDate(exp.endDate) || '—'}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => setEditingId(exp.id)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(exp.id)}
                  disabled={deletingId === exp.id}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}

        {adding && (
          <ExperienceForm
            onCancel={() => setAdding(false)}
            onSubmit={async (data) => {
              await onCreate(data)
              setAdding(false)
            }}
          />
        )}

        {experiences.length === 0 && !adding && profile && (
          <p className="text-sm text-gray-500">No experience added yet.</p>
        )}
      </div>
    </div>
  )
}

export default ExperienceEditor
