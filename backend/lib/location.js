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

module.exports = { resolveLocationScope }
