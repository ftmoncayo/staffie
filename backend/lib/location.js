const prisma = require('./prisma')

// A Profile records its location at whichever precision the person chose -
// country, state, city, or suburb - with only the deepest level ever
// populated (see routes/profile.js's PUT / handler). Suburb is still stored
// and shown (e.g. locationString on the frontend), but it's never a filter
// dimension: a suburb-precision profile collapses to its parent city here,
// so filtering treats it exactly like a city-precision profile in that city.
// Expects `profile.suburb` to be loaded (at least `{ cityId }`) whenever
// `profile.suburbId` is set - see profileInclude in routes/profile.js.
// Every location-aware feature should resolve the effective scope through
// here rather than inspecting countryId/stateId/cityId/suburbId directly.
function resolveLocationScope(profile) {
  if (!profile) return null
  if (profile.suburbId) {
    const cityId = profile.suburb?.cityId
    return cityId ? { type: 'CITY', id: cityId } : null
  }
  if (profile.cityId) return { type: 'CITY', id: profile.cityId }
  if (profile.stateId) return { type: 'STATE', id: profile.stateId }
  if (profile.countryId) return { type: 'COUNTRY', id: profile.countryId }
  return null
}

// Suburb is deliberately excluded - it's descriptive data only (venue
// location display, the venue picker's "Name, Suburb" labels), never a
// filter level. See resolveLocationScope and LocationScopeFilter.
const SCOPE_TYPES = ['COUNTRY', 'STATE', 'CITY']

// Reads a {type, id} scope out of two request-query fields, validating the
// type against the three known levels. Returns null for anything malformed
// or absent - callers treat a null scope as "don't filter."
function parseScopeParam(type, id) {
  if (!SCOPE_TYPES.includes(type)) return null
  if (typeof id !== 'string' || !id.trim()) return null
  return { type, id: id.trim() }
}

// Resolves a scope up to its full ancestor chain (countryId always present;
// stateId/cityId present only at-or-above the scope's own depth) by looking
// up the actual row. Returns null for an unresolvable scope (bad id) or no
// scope at all - callers treat that the same as "don't filter." Scope can
// only ever be COUNTRY/STATE/CITY (see SCOPE_TYPES) - suburb is descriptive
// data only, never a filter level.
async function resolveScopeAncestors(scope) {
  if (!scope) return null
  if (scope.type === 'COUNTRY') {
    return { countryId: scope.id }
  }
  if (scope.type === 'STATE') {
    const state = await prisma.state.findUnique({ where: { id: scope.id }, select: { countryId: true } })
    return state ? { countryId: state.countryId, stateId: scope.id } : null
  }
  if (scope.type === 'CITY') {
    const city = await prisma.city.findUnique({
      where: { id: scope.id },
      select: { stateId: true, state: { select: { countryId: true } } },
    })
    return city ? { countryId: city.state.countryId, stateId: city.stateId, cityId: scope.id } : null
  }
  return null
}

// Prisma where-fragment matching Profiles located at-or-within the resolved
// scope. A profile recorded at a shallower precision than the scope is
// excluded (its exact placement within the scope can't be confirmed) - e.g.
// a country-only profile never matches a city-level scope. Scope itself can
// only be COUNTRY/STATE/CITY (see SCOPE_TYPES), but a *profile* can still be
// suburb-precision, so every branch below has to OR in the suburb/city
// alternatives too, since Profile keeps only its deepest field populated
// (unlike Venue, see venueLocationWhere).
function profileLocationWhere(ancestors) {
  if (!ancestors) return {}
  if (ancestors.cityId) {
    return { OR: [{ cityId: ancestors.cityId }, { suburb: { cityId: ancestors.cityId } }] }
  }
  if (ancestors.stateId) {
    return {
      OR: [
        { stateId: ancestors.stateId },
        { city: { stateId: ancestors.stateId } },
        { suburb: { city: { stateId: ancestors.stateId } } },
      ],
    }
  }
  return {
    OR: [
      { countryId: ancestors.countryId },
      { state: { countryId: ancestors.countryId } },
      { city: { state: { countryId: ancestors.countryId } } },
      { suburb: { city: { state: { countryId: ancestors.countryId } } } },
    ],
  }
}

// Prisma where-fragment matching Venues located at-or-within the resolved
// scope. Scope tops out at CITY (see SCOPE_TYPES) - a venue's own suburb, if
// it has one, is descriptive data only and plays no part in matching.
function venueLocationWhere(ancestors) {
  if (!ancestors) return {}
  if (ancestors.cityId) return { cityId: ancestors.cityId }
  if (ancestors.stateId) return { city: { stateId: ancestors.stateId } }
  return { city: { state: { countryId: ancestors.countryId } } }
}

// Prisma where-fragment matching Businesses whose declared coverage reaches
// the resolved scope. Unlike Profile/Venue, a Business's location represents
// an explicit coverage claim rather than imprecision: GLOBAL always matches,
// and a COUNTRY-scoped business matches any narrower scope within that
// country. SPECIFIC_CITIES only ever records city-level locations, matching
// the CITY branch below (the deepest scope can ever be).
function businessLocationWhere(ancestors) {
  if (!ancestors) return {}
  const global = { locationScope: 'GLOBAL' }
  const countryCoverage = { locationScope: 'COUNTRY', countryId: ancestors.countryId }
  if (ancestors.cityId) {
    return { OR: [global, countryCoverage, { locations: { some: { cityId: ancestors.cityId } } }] }
  }
  if (ancestors.stateId) {
    return { OR: [global, countryCoverage, { locations: { some: { city: { stateId: ancestors.stateId } } } }] }
  }
  return {
    OR: [global, countryCoverage, { locations: { some: { city: { state: { countryId: ancestors.countryId } } } } }],
  }
}

module.exports = {
  resolveLocationScope,
  parseScopeParam,
  resolveScopeAncestors,
  profileLocationWhere,
  venueLocationWhere,
  businessLocationWhere,
}
