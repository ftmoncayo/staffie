const LEVEL_STYLES = {
  1: { wrapper: 'bg-surface border border-border-strong text-text-muted', remove: 'text-text-faint hover:text-text' },
  2: { wrapper: 'bg-black text-white', remove: 'text-white/80 hover:text-white' },
  3: { wrapper: 'bg-black text-white', remove: 'text-white/80 hover:text-white' },
}

function Tag({ children, onRemove, removeLabel, removeDisabled = false, level }) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES[2]

  return (
    <span className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${style.wrapper}`}>
      {level === 2 && <span aria-hidden="true">✓</span>}
      {level === 3 && <span aria-hidden="true">⭐</span>}
      {children}
      {onRemove && (
        <button
          type="button"
          disabled={removeDisabled}
          onClick={onRemove}
          className={`${style.remove} disabled:opacity-50`}
          aria-label={removeLabel}
        >
          ×
        </button>
      )}
    </span>
  )
}

export default Tag
