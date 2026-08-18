// A profile's location is stored at whichever precision was chosen - only one
// of country/state/city/suburb is ever populated - so every display and edit
// helper here has to walk up whichever relation is actually present rather
// than assuming city/suburb are always there.

export function rightToWorkLabel(countryName) {
  return countryName ? `Eligible to work in ${countryName}` : 'Eligible to work here'
}

function locationChain(profile) {
  if (profile?.suburb) {
    return [
      profile.suburb.name,
      profile.suburb.city?.name,
      profile.suburb.city?.state?.name,
      profile.suburb.city?.state?.country?.name,
    ]
  }
  if (profile?.city) {
    return [profile.city.name, profile.city.state?.name, profile.city.state?.country?.name]
  }
  if (profile?.state) {
    return [profile.state.name, profile.state.country?.name]
  }
  if (profile?.country) {
    return [profile.country.name]
  }
  return []
}

export function locationString(profile) {
  return locationChain(profile).filter(Boolean).join(', ') || '—'
}

export function locationCountryName(profile) {
  return (
    profile?.country?.name ||
    profile?.state?.country?.name ||
    profile?.city?.state?.country?.name ||
    profile?.suburb?.city?.state?.country?.name ||
    null
  )
}

// Hydrates a LocationCascade's four levels from a profile that only has its
// deepest level populated, so editing an existing "State only" profile still
// shows that state (and its country) pre-filled instead of starting blank.
export function initialLocationSelection(profile) {
  if (profile?.suburb) {
    return {
      suburb: profile.suburb,
      city: profile.suburb.city || null,
      state: profile.suburb.city?.state || null,
      country: profile.suburb.city?.state?.country || null,
    }
  }
  if (profile?.city) {
    return {
      suburb: null,
      city: profile.city,
      state: profile.city.state || null,
      country: profile.city.state?.country || null,
    }
  }
  if (profile?.state) {
    return { suburb: null, city: null, state: profile.state, country: profile.state.country || null }
  }
  if (profile?.country) {
    return { suburb: null, city: null, state: null, country: profile.country }
  }
  return { suburb: null, city: null, state: null, country: null }
}
