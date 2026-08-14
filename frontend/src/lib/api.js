export const API_URL = import.meta.env.VITE_API_URL

const TOKEN_KEY = 'staffie_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || 'Request failed')
  }

  return data
}

function authRequest(path, options = {}) {
  return request(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
}

export function signup(email, password) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchMe(token) {
  return request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function fetchProfile() {
  return authRequest('/api/profile')
}

export function saveProfile(profile) {
  return authRequest('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}

export function addSkill(name) {
  return authRequest('/api/profile/skills', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function removeSkill(name) {
  return authRequest(`/api/profile/skills/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}

export function addKnowledgeArea(name) {
  return authRequest('/api/profile/knowledge-areas', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function removeKnowledgeArea(name) {
  return authRequest(`/api/profile/knowledge-areas/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}

export function createExperience(entry) {
  return authRequest('/api/profile/experience', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export function updateExperience(id, entry) {
  return authRequest(`/api/profile/experience/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  })
}

export function deleteExperience(id) {
  return authRequest(`/api/profile/experience/${id}`, {
    method: 'DELETE',
  })
}

export function createCertification(entry) {
  return authRequest('/api/profile/certifications', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export function updateCertification(id, entry) {
  return authRequest(`/api/profile/certifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  })
}

export function deleteCertification(id) {
  return authRequest(`/api/profile/certifications/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchCities(search) {
  const data = await authRequest(`/api/cities?search=${encodeURIComponent(search || '')}`)
  return data.cities
}

export async function createCity(name) {
  const data = await authRequest('/api/cities', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.city
}

export async function fetchSkillOptions(search) {
  const data = await authRequest(`/api/skills?search=${encodeURIComponent(search || '')}`)
  return data.skills
}

export async function fetchKnowledgeAreaOptions(search) {
  const data = await authRequest(
    `/api/knowledge-areas?search=${encodeURIComponent(search || '')}`,
  )
  return data.knowledgeAreas
}

export async function fetchCertificationTypes(search) {
  const data = await authRequest(
    `/api/certification-types?search=${encodeURIComponent(search || '')}`,
  )
  return data.certificationTypes
}

export async function createCertificationType(name) {
  const data = await authRequest('/api/certification-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.certificationType
}

export async function fetchVenueSpecialties(search) {
  const data = await authRequest(
    `/api/venue-specialties?search=${encodeURIComponent(search || '')}`,
  )
  return data.venueSpecialties
}

export async function createVenueSpecialty(name) {
  const data = await authRequest('/api/venue-specialties', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.venueSpecialty
}

export async function fetchVenues({ search, sort, status } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (status) params.set('status', status)
  const data = await authRequest(`/api/venues?${params.toString()}`)
  return data.venues
}

export async function fetchVenueOptions(search) {
  const venues = await fetchVenues({ search })
  return venues.map((v) => ({ id: v.id, name: v.name }))
}

export async function fetchVenueTypeOptions(search) {
  const venues = await fetchVenues({})
  const types = [...new Set(venues.map((v) => v.venueType).filter(Boolean))]
  const filtered = search
    ? types.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : types
  return filtered.map((t) => ({ id: t, name: t }))
}

export async function fetchVenue(id) {
  const data = await authRequest(`/api/venues/${id}`)
  return data.venue
}

export async function createVenue(venue) {
  const data = await authRequest('/api/venues', {
    method: 'POST',
    body: JSON.stringify(venue),
  })
  return data.venue
}

export async function updateVenue(id, venue) {
  const data = await authRequest(`/api/venues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(venue),
  })
  return data.venue
}

export async function verifyVenue(id) {
  const data = await authRequest(`/api/venues/${id}/verify`, {
    method: 'PUT',
  })
  return data.venue
}
