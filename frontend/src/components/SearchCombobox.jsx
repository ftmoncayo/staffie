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
}) {
  const [query, setQuery] = useState(initialQuery)
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(initialQuery)
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
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg">
          {loading && <p className="px-3 py-2 text-sm text-gray-500">Searching...</p>}
          {!loading &&
            visibleOptions.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleSelect(item)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {item.name}
              </button>
            ))}
          {!loading && trimmedQuery && !exactMatch && (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="block w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {creating ? 'Adding...' : `+ Add "${trimmedQuery}"`}
            </button>
          )}
          {!loading && visibleOptions.length === 0 && !trimmedQuery && (
            <p className="px-3 py-2 text-sm text-gray-500">Start typing to search</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchCombobox
