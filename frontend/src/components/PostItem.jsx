import { Link } from 'react-router-dom'
import Engagement from './Engagement'

function personName(profile) {
  if (!profile) return null
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function PostItem({ post, canDelete, onDelete }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to={`/profile/${post.author.id}`}
            className="text-sm font-medium text-text hover:text-accent hover:underline"
          >
            {personName(post.author.profile) || post.author.email}
          </Link>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text">{post.content}</p>
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

      <Engagement targetType="POST" targetId={post.id} />
    </div>
  )
}

export default PostItem
