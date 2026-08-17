import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function CommentSection({ loading, comments, canEngage, content, setContent, submitting, onSubmit, onDelete }) {
  const { user } = useAuth()

  return (
    <>
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
                    onClick={() => onDelete(comment.id)}
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

      {canEngage && (
        <form onSubmit={onSubmit} className="flex items-center gap-2">
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
      )}
    </>
  )
}

export default CommentSection
