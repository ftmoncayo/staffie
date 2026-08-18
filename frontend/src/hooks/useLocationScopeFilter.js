import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import { initialLocationSelection, scopeFromSelection } from '../lib/location'

const EMPTY_SELECTION = { country: null, state: null, city: null, suburb: null }

// Seeds a location-scope filter from the viewer's own profile (see
// resolveLocationScope on the backend) and exposes the same
// country/state/city/suburb selection LocationScopeFilter edits. Selecting
// any level filters to that level (deepest wins); clearing all four means
// unfiltered - mirroring the existing Posts city filter, generalized to all
// four location levels.
//
// `ready` stays false until the viewer's own profile has been fetched, so
// callers can hold off their first (scoped) request until the real default
// is known, rather than firing an unscoped one first.
function useLocationScopeFilter() {
  const [selection, setSelection] = useState(EMPTY_SELECTION)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api
      .fetchProfile()
      .then((data) => setSelection(initialLocationSelection(data.profile)))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  return { selection, setSelection, scope: scopeFromSelection(selection), ready }
}

export default useLocationScopeFilter
