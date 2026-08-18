import { Link } from 'react-router-dom'
import useEngagement from '../hooks/useEngagement'
import CommentSection from './CommentSection'

function personName(profile) {
  if (!profile) return null
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function PostItem({ post, canDelete, onDelete }) {
  const { comments, canEngage, loading, error, content, setContent, submitting, handleSubmit, handleDelete } =
    useEngagement('POST', post.id)

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="whitespace-pre-wrap text-sm text-text">
            <Link
              to={`/profile/${post.author.id}`}
              className="font-medium text-success hover:text-success-hover hover:underline"
            >
              {personName(post.author.profile) || post.author.email}
            </Link>{' '}
            says: {post.content}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-text-faint">{formatDate(post.createdAt)}</span>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="text-xs text-danger hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
        {error && <p className="text-xs text-danger">{error}</p>}
        {!loading && comments.length > 0 && (
          <span className="text-xs text-text-faint">
            {comments.length} comment{comments.length === 1 ? '' : 's'}
          </span>
        )}
        <CommentSection
          loading={loading}
          comments={comments}
          canEngage={canEngage}
          content={content}
          setContent={setContent}
          submitting={submitting}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}

export default PostItem
