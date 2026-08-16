import { useState } from 'react'

function ShowMore({ items, renderItem, initialCount, incrementCount, emptyMessage }) {
  const [visibleCount, setVisibleCount] = useState(initialCount)

  if (items.length === 0) {
    return emptyMessage ? <p className="text-sm text-text-faint">{emptyMessage}</p> : null
  }

  const hasMore = visibleCount < items.length

  return (
    <div className="flex flex-col gap-3">
      {items.slice(0, visibleCount).map(renderItem)}
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + incrementCount)}
          className="self-start text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  )
}

export default ShowMore
