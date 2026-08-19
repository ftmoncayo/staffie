import { useState } from 'react'
import * as api from '../lib/api'
import SearchCombobox from './SearchCombobox'
import { venueOptionLabel } from '../lib/location'

// Venue search/picker used wherever a venue is chosen (Experience entry,
// Event location). Defaults to the viewer's own profile location scope
// (resolved server-side from the request's own user, not fetched here - see
// fetchVenueOptions); the "Search a different location" toggle removes that
// filter entirely for one search (off by default, never persisted). Result
// labels show enough location context to disambiguate venues that share a
// name across cities - see venueOptionLabel.
function VenuePicker({
  onSelect,
  onCreate,
  allowCreate = true,
  initialQuery = '',
  placeholder = 'Search or add a venue...',
}) {
  const [unrestricted, setUnrestricted] = useState(false)

  function fetchOptions(search) {
    return api.fetchVenueOptions(search, { unrestricted })
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchCombobox
        fetchOptions={fetchOptions}
        onCreate={onCreate}
        onSelect={onSelect}
        allowCreate={allowCreate}
        initialQuery={initialQuery}
        placeholder={placeholder}
        getOptionLabel={(venue) => venueOptionLabel(venue, { unrestricted })}
      />
      <label className="flex items-center gap-2 text-xs text-text-muted">
        <input
          type="checkbox"
          checked={unrestricted}
          onChange={(e) => setUnrestricted(e.target.checked)}
          className="h-3.5 w-3.5 accent-accent"
        />
        Search a different location
      </label>
    </div>
  )
}

export default VenuePicker
