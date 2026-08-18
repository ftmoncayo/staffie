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

// Mirrors resolveLocationScope on the backend: the deepest of the four
// selected levels is the effective scope, null when nothing is selected
// (unfiltered). Used by LocationScopeFilter and every page that filters by
// location.
export function scopeFromSelection({ country, state, city, suburb } = {}) {
  if (suburb) return { type: 'SUBURB', id: suburb.id }
  if (city) return { type: 'CITY', id: city.id }
  if (state) return { type: 'STATE', id: state.id }
  if (country) return { type: 'COUNTRY', id: country.id }
  return null
}

// Short label for a LocationScopeFilter's collapsed summary button.
export function locationSelectionLabel({ country, state, city, suburb } = {}) {
  if (suburb) return city ? `${suburb.name}, ${city.name}` : suburb.name
  if (city) return city.name
  if (state) return state.name
  if (country) return country.name
  return 'All locations'
}

// First three letters of a city name, capitalized (Melbourne -> Mel).
export function cityAbbreviation(cityName) {
  if (!cityName) return ''
  const letters = cityName.slice(0, 3)
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
}

// Display label for a venue option in the venue picker (see VenuePicker).
// Scoped to the viewer's own location: "Name, Suburb" (just the name if no
// suburb). Unrestricted search: the city abbreviation is appended too, since
// suburb/city names alone are no longer enough to place the venue.
export function venueOptionLabel(venue, { unrestricted = false } = {}) {
  const abbrev = unrestricted && venue.city ? ` (${cityAbbreviation(venue.city.name)})` : ''
  return venue.suburb ? `${venue.name}, ${venue.suburb.name}${abbrev}` : `${venue.name}${abbrev}`
}
