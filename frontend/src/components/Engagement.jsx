import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { useAuth } from '../context/AuthContext'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function Engagement({ targetType, targetId }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [nodCount, setNodCount] = useState(0)
  const [nodded, setNodded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nodding, setNodding] = useState(false)

  function refresh() {
    return api.fetchEngagement(targetType, targetId).then((data) => {
      setComments(data.comments)
      setNodCount(data.nodCount)
      setNodded(data.nodded)
    })
  }

  useEffect(() => {
    setLoading(true)
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId])

  async function handleNod() {
    setError('')
    setNodding(true)
    try {
      const result = await api.toggleNod(targetType, targetId)
      setNodded(result.nodded)
      setNodCount(result.nodCount)
    } catch (err) {
      setError(err.message)
    } finally {
      setNodding(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await api.createComment(targetType, targetId, content.trim())
      setContent('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    setError('')
    try {
      await api.deleteComment(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleNod}
          disabled={nodding}
          className={
            nodded
              ? 'rounded border border-accent px-2 py-1 text-xs font-medium text-accent disabled:opacity-50'
              : 'rounded border border-border-strong px-2 py-1 text-xs text-text-muted hover:bg-surface-hover disabled:opacity-50'
          }
        >
          👍 Nod{nodCount > 0 ? ` (${nodCount})` : ''}
        </button>
        {!loading && comments.length > 0 && (
          <span className="text-xs text-text-faint">
            {comments.length} comment{comments.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {!loading && comments.length > 0 && (
        <div className="flex flex-col gap-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start justify-between gap-2 rounded bg-bg px-3 py-2">
              <div>
                <Link
                  to={`/profile/${comment.author.id}`}
                  className="text-xs font-medium text-text hover:text-accent hover:underline"
                >
                  {comment.author.name}
                </Link>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-text">{comment.content}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-text-faint">{formatDate(comment.createdAt)}</span>
                {(comment.author.id === user?.id || user?.isAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded border border-border-strong bg-bg px-3 py-1.5 text-xs text-text focus:border-accent"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  )
}

export default Engagement
