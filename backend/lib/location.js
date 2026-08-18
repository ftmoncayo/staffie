const prisma = require('./prisma')

// A Profile records its location at whichever precision the person chose -
// country, state, city, or suburb - with only the deepest level ever
// populated (see routes/profile.js's PUT / handler). Every location-aware
// feature should resolve the effective scope through here rather than
// inspecting countryId/stateId/cityId/suburbId directly, so the priority
// order only has to live in one place.
function resolveLocationScope(profile) {
  if (!profile) return null
  if (profile.suburbId) return { type: 'SUBURB', id: profile.suburbId }
  if (profile.cityId) return { type: 'CITY', id: profile.cityId }
  if (profile.stateId) return { type: 'STATE', id: profile.stateId }
  if (profile.countryId) return { type: 'COUNTRY', id: profile.countryId }
  return null
}

const SCOPE_TYPES = ['COUNTRY', 'STATE', 'CITY', 'SUBURB']

// Reads a {type, id} scope out of two request-query fields, validating the
// type against the four known levels. Returns null for anything malformed or
// absent - callers treat a null scope as "don't filter."
function parseScopeParam(type, id) {
  if (!SCOPE_TYPES.includes(type)) return null
  if (typeof id !== 'string' || !id.trim()) return null
  return { type, id: id.trim() }
}

// Resolves a scope up to its full ancestor chain (countryId always present;
// stateId/cityId/suburbId present only at-or-above the scope's own depth) by
// looking up the actual row. Returns null for an unresolvable scope (bad id)
// or no scope at all - callers treat that the same as "don't filter."
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
  if (scope.type === 'SUBURB') {
    const suburb = await prisma.suburb.findUnique({
      where: { id: scope.id },
      select: { cityId: true, city: { select: { stateId: true, state: { select: { countryId: true } } } } },
    })
    return suburb
      ? {
          countryId: suburb.city.state.countryId,
          stateId: suburb.city.stateId,
          cityId: suburb.cityId,
          suburbId: scope.id,
        }
      : null
  }
  return null
}

// Prisma where-fragment matching Profiles located at-or-within the resolved
// scope. A profile recorded at a shallower precision than the scope is
// excluded (its exact placement within the scope can't be confirmed) - e.g.
// a country-only profile never matches a city-level scope. Every branch
// below has to OR in the suburb/city alternatives too, since Profile keeps
// only its deepest field populated (unlike Venue, see venueLocationWhere).
function profileLocationWhere(ancestors) {
  if (!ancestors) return {}
  if (ancestors.suburbId) {
    return { suburbId: ancestors.suburbId }
  }
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
// scope. Venue creation always keeps cityId populated alongside suburbId
// (see venues.js's validateSuburbId), so - unlike Profile - there's no need
// to OR in a suburb->city alternative for the CITY/STATE/COUNTRY branches.
function venueLocationWhere(ancestors) {
  if (!ancestors) return {}
  if (ancestors.suburbId) return { suburbId: ancestors.suburbId }
  if (ancestors.cityId) return { cityId: ancestors.cityId }
  if (ancestors.stateId) return { city: { stateId: ancestors.stateId } }
  return { city: { state: { countryId: ancestors.countryId } } }
}

// Prisma where-fragment matching Businesses whose declared coverage reaches
// the resolved scope. Unlike Profile/Venue, a Business's location represents
// an explicit coverage claim rather than imprecision: GLOBAL always matches,
// and a COUNTRY-scoped business matches any narrower scope within that
// country. SPECIFIC_CITIES only ever records city-level locations (nothing
// narrower), so a SUBURB scope falls back to matching its parent city.
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
