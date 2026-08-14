function Tag({ children, onRemove, removeLabel, removeDisabled = false }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-black px-4 py-1.5 text-sm text-white">
      {children}
      {onRemove && (
        <button
          type="button"
          disabled={removeDisabled}
          onClick={onRemove}
          className="text-white/80 hover:text-white disabled:opacity-50"
          aria-label={removeLabel}
        >
          ×
        </button>
      )}
    </span>
  )
}

export default Tag
