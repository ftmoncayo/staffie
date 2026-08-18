import { useEffect, useRef, useState } from 'react'

function TagLevelInfo() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="What do the skill and knowledge tag colors mean?"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-border-strong text-[10px] leading-none text-text-faint hover:border-accent hover:text-accent"
      >
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-56 rounded-lg border border-border bg-surface p-3 text-xs text-text shadow-lg shadow-black/40">
          <p className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-border-strong bg-surface" />
            Grey = self-declared
          </p>
          <p className="mt-1.5 flex items-center gap-2">
            <span className="w-3 shrink-0 text-center">✓</span>
            Tick = peer-endorsed
          </p>
          <p className="mt-1.5 flex items-center gap-2">
            <span className="w-3 shrink-0 text-center">⭐</span>
            Star = manager-endorsed
          </p>
        </div>
      )}
    </span>
  )
}

export default TagLevelInfo
