import { useEffect, useRef, useState } from 'react'
import LocationCascade from './LocationCascade'
import { locationSelectionLabel } from '../lib/location'

// Location-scope filter control: a collapsed summary button ("Location:
// Melbourne") that expands into the same Country -> State -> City -> Suburb
// cascade used to set a Profile's own location. Selecting any level filters
// to that level (deepest wins, matching resolveLocationScope); "All
// locations" clears the filter entirely.
function LocationScopeFilter({ country, state, city, suburb, onChange, label = 'Location' }) {
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

  function handleCountryChange(newCountry) {
    onChange({ country: newCountry, state: null, city: null, suburb: null })
  }
  function handleStateChange(newState) {
    onChange({ country, state: newState, city: null, suburb: null })
  }
  function handleCityChange(newCity) {
    onChange({ country, state, city: newCity, suburb: null })
  }
  function handleSuburbChange(newSuburb) {
    onChange({ country, state, city, suburb: newSuburb })
  }
  function handleClear() {
    onChange({ country: null, state: null, city: null, suburb: null })
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
      >
        {label}: {locationSelectionLabel({ country, state, city, suburb })}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 flex w-72 flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/40">
          <LocationCascade
            country={country}
            state={state}
            city={city}
            suburb={suburb}
            onCountryChange={handleCountryChange}
            onStateChange={handleStateChange}
            onCityChange={handleCityChange}
            onSuburbChange={handleSuburbChange}
          />
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={handleClear} className="text-accent hover:text-accent-hover hover:underline">
              All locations
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-text-muted hover:text-text">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LocationScopeFilter
