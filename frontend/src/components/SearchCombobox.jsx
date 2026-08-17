import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 250

function SearchCombobox({
  fetchOptions,
  onSelect,
  onCreate,
  placeholder,
  initialQuery = '',
  clearOnSelect = false,
  excludeNames = [],
  allowCreate = true,
  disabled = false,
}) {
  const [query, setQuery] = useState(initialQuery)
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [hasSelection, setHasSelection] = useState(Boolean(initialQuery))
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(initialQuery)
    setHasSelection(Boolean(initialQuery))
  }, [initialQuery])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timeout = setTimeout(() => {
      fetchOptions(query)
        .then((results) => {
          if (!cancelled) setOptions(results)
        })
        .catch(() => {
          if (!cancelled) setOptions([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query, fetchOptions])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleOptions = options.filter((o) => !excludeNames.includes(o.name))
  const trimmedQuery = query.trim()
  const exactMatch = visibleOptions.some(
    (o) => o.name.toLowerCase() === trimmedQuery.toLowerCase(),
  )

  function handleSelect(item) {
    onSelect(item)
    setOpen(false)
    setQuery(clearOnSelect ? '' : item.name)
    setHasSelection(!clearOnSelect)
  }

  async function handleCreate() {
    if (!trimmedQuery) return
    setError('')
    setCreating(true)
    try {
      const item = await onCreate(trimmedQuery)
      onSelect(item)
      setOpen(false)
      setQuery(clearOnSelect ? '' : item.name)
      setHasSelection(!clearOnSelect)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function handleClear() {
    setQuery('')
    setHasSelection(false)
    setOpen(false)
    onSelect(null)
  }

  const showClear = hasSelection && !clearOnSelect && !disabled

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHasSelection(false)
        }}
        onFocus={() => setOpen(true)}
        className={`w-full rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-faint ${showClear ? 'pr-8' : ''}`}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
        >
          ×
        </button>
      )}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-border bg-surface shadow-lg shadow-black/40">
          {loading && <p className="px-3 py-2 text-sm text-text-faint">Searching...</p>}
          {!loading &&
            visibleOptions.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleSelect(item)}
                className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-hover"
              >
                {item.name}
              </button>
            ))}
          {!loading && trimmedQuery && !exactMatch && allowCreate && (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-surface-hover disabled:opacity-50"
            >
              {creating ? 'Adding...' : `+ Add "${trimmedQuery}"`}
            </button>
          )}
          {!loading && visibleOptions.length === 0 && !trimmedQuery && (
            <p className="px-3 py-2 text-sm text-text-faint">Start typing to search</p>
          )}
          {!loading && visibleOptions.length === 0 && trimmedQuery && !allowCreate && (
            <p className="px-3 py-2 text-sm text-text-faint">No matches found</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchCombobox
