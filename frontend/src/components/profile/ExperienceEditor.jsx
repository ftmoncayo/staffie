import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'
import VenuePicker from '../VenuePicker'
import VenueForm from '../venue/VenueForm'
import Modal from '../Modal'

const emptyForm = { venue: null, roleTitle: '', startDate: '', endDate: '', isCurrent: false }

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function ExperienceForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newVenueName, setNewVenueName] = useState(null)
  const pendingVenueRef = useRef(null)

  function handleVenueCreateRequest(name) {
    setNewVenueName(name)
    return new Promise((resolve, reject) => {
      pendingVenueRef.current = { resolve, reject }
    })
  }

  async function handleNewVenueSubmit(data) {
    const venue = await api.createVenue(data)
    setNewVenueName(null)
    pendingVenueRef.current?.resolve(venue)
    pendingVenueRef.current = null
  }

  function handleNewVenueCancel() {
    setNewVenueName(null)
    pendingVenueRef.current?.reject(new Error('Venue creation cancelled'))
    pendingVenueRef.current = null
  }

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
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Venue
          <VenuePicker
            onCreate={handleVenueCreateRequest}
            onSelect={(venue) => setForm({ ...form, venue })}
            initialQuery={form.venue?.name || ''}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Role title
            <input
              type="text"
              required
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
              className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Start date
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            End date
            <input
              type="date"
              disabled={form.isCurrent}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent disabled:bg-surface disabled:text-text-faint"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: '' })}
            className="h-4 w-4 accent-accent"
          />
          I currently work here
        </label>

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

      <Modal open={newVenueName !== null} onClose={handleNewVenueCancel} title="Create venue">
        <p className="mb-3 text-sm text-text-muted">
          This venue doesn't exist yet — it'll be created with the details you enter, but will be
          locked from editing until it's verified by an admin or confirmed by its manager.
        </p>
        <VenueForm
          initial={{ name: newVenueName || '' }}
          submitLabel="Create venue"
          onSubmit={handleNewVenueSubmit}
          onCancel={handleNewVenueCancel}
          standalone={false}
        />
      </Modal>
    </>
  )
}

function ExperienceEditor({ profile, experiences, onCreate, onUpdate, onDelete, prefillVenue }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const editingExp = experiences.find((exp) => exp.id === editingId) || null

  useEffect(() => {
    if (prefillVenue) setAdding(true)
  }, [prefillVenue])

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
        <h2 className="text-xl font-semibold text-text">Experience</h2>
        {profile && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            + Add experience
          </button>
        )}
      </div>

      {!profile && (
        <p className="mt-2 text-sm text-text-faint">
          Complete your ID Card above before adding experience.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {experiences.map((exp) => (
          <div key={exp.id} className="flex items-start justify-between rounded border border-border p-4">
            <div>
              <p className="font-medium text-text">{exp.roleTitle}</p>
              <Link to={`/venues/${exp.venue.id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
                {exp.venue.name}
              </Link>
              <p className="text-sm text-text-faint">
                {formatDate(exp.startDate)} – {exp.isCurrent ? 'Current' : formatDate(exp.endDate) || '—'}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditingId(exp.id)} className="text-accent hover:text-accent-hover hover:underline">
                Edit
              </button>
              <button
                onClick={() => handleDelete(exp.id)}
                disabled={deletingId === exp.id}
                className="text-danger hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {experiences.length === 0 && profile && (
          <p className="text-sm text-text-faint">No experience added yet.</p>
        )}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add experience">
        <ExperienceForm
          initial={prefillVenue ? { ...emptyForm, venue: prefillVenue } : undefined}
          onCancel={() => setAdding(false)}
          onSubmit={async (data) => {
            await onCreate(data)
            setAdding(false)
          }}
        />
      </Modal>

      <Modal open={editingId != null} onClose={() => setEditingId(null)} title="Edit experience">
        {editingExp && (
          <ExperienceForm
            initial={{
              venue: editingExp.venue,
              roleTitle: editingExp.roleTitle,
              startDate: formatDate(editingExp.startDate),
              endDate: formatDate(editingExp.endDate),
              isCurrent: editingExp.isCurrent,
            }}
            onCancel={() => setEditingId(null)}
            onSubmit={async (data) => {
              await onUpdate(editingExp.id, data)
              setEditingId(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default ExperienceEditor
