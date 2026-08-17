function NodButton({ canEngage, nodded, nodCount, nodding, onNod }) {
  if (!canEngage) {
    return nodCount > 0 ? <span className="text-xs text-text-faint">👍 {nodCount}</span> : null
  }

  return (
    <button
      type="button"
      onClick={onNod}
      disabled={nodding}
      className={
        nodded
          ? 'rounded border border-accent px-2 py-1 text-xs font-medium text-accent disabled:opacity-50'
          : 'rounded border border-border-strong px-2 py-1 text-xs text-text-muted hover:bg-surface-hover disabled:opacity-50'
      }
    >
      👍 Nod{nodCount > 0 ? ` (${nodCount})` : ''}
    </button>
  )
}

export default NodButton
