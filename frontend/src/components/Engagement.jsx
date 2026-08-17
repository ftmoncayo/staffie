import useEngagement from '../hooks/useEngagement'
import NodButton from './NodButton'
import CommentSection from './CommentSection'

function Engagement({ targetType, targetId }) {
  const {
    comments,
    nodCount,
    nodded,
    canEngage,
    loading,
    error,
    content,
    setContent,
    submitting,
    nodding,
    handleNod,
    handleSubmit,
    handleDelete,
  } = useEngagement(targetType, targetId)

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <NodButton canEngage={canEngage} nodded={nodded} nodCount={nodCount} nodding={nodding} onNod={handleNod} />
        {!loading && comments.length > 0 && (
          <span className="text-xs text-text-faint">
            {comments.length} comment{comments.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

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
  )
}

export default Engagement
