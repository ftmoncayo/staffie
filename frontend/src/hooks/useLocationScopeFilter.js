import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../context/ProfileContext'
import { initialLocationSelection, scopeFromSelection } from '../lib/location'

const EMPTY_SELECTION = { country: null, state: null, city: null, suburb: null }

// Backs a LocationScopeFilter control. Until the viewer explicitly changes
// the filter, `scope` is `undefined` - meaning "don't send scopeType/scopeId
// at all," which every scope-aware endpoint reads as "default to my own
// profile location" server-side (see resolveScopeForRequest on the
// backend). That's what lets a page fire its real data request immediately
// on mount instead of fetching the viewer's own profile first and gating on
// it - the old source of the profile-fetch-then-feed-fetch cascade.
//
// `selection` (for the popover's display) still needs the viewer's own
// profile to show the right default once it's known, so it reads from the
// shared ProfileContext (fetched once at the app root, not per-hook-use) -
// zero extra network cost even though this hook is used on 7+ pages.
function useLocationScopeFilter() {
  const { profile } = useProfile()
  const [touched, setTouched] = useState(false)
  const [ownSelection, setOwnSelection] = useState(EMPTY_SELECTION)
  const [override, setOverride] = useState(EMPTY_SELECTION)

  useEffect(() => {
    if (!touched) setOwnSelection(initialLocationSelection(profile))
  }, [profile, touched])

  function setSelection(newSelection) {
    setTouched(true)
    setOverride(newSelection)
  }

  const selection = touched ? override : ownSelection
  // Memoized so it's only a new reference when the effective scope actually
  // changes - callers put this directly in a fetch effect's dependency array.
  const scope = useMemo(() => (touched ? scopeFromSelection(override) : undefined), [touched, override])

  return { selection, setSelection, scope }
}

export default useLocationScopeFilter
