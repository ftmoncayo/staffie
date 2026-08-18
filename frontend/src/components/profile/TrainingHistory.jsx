import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

const STATUS_LABELS = {
  INTERESTED: 'Interested',
  ATTENDED: 'Attended',
}

// DID_NOT_ATTEND rows never reach here — GET /api/profile/training excludes
// them entirely, not just hides them client-side.
function TrainingHistory() {
  const [training, setTraining] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchTraining()
      .then(setTraining)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Training</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {!loading && training.length === 0 && (
          <p className="text-sm text-text-faint">No training or events yet.</p>
        )}
        {training.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2"
          >
            <div>
              <Link
                to={`/events/${t.event.id}`}
                className="text-sm font-medium text-text hover:text-accent hover:underline"
              >
                {t.event.title}
              </Link>
              <p className="text-sm text-text-faint">
                {t.event.category.name} · {formatDate(t.event.startAt)}
              </p>
            </div>
            <span className="shrink-0 rounded border border-border-strong px-2 py-0.5 text-xs text-text-muted">
              {STATUS_LABELS[t.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TrainingHistory
