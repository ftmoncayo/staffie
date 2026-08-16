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

export function forgotPassword(email) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token, password) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
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

export async function saveProfileAbout(about) {
  const data = await authRequest('/api/profile/about', {
    method: 'PUT',
    body: JSON.stringify({ about }),
  })
  return data.profile
}

export function fetchPublicProfile(userId) {
  return authRequest(`/api/profile/${userId}`)
}

export async function fetchUserActivity(userId) {
  const data = await authRequest(`/api/profile/${userId}/activity`)
  return data.activities
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

export async function fetchCountries(search) {
  const data = await authRequest(`/api/countries?search=${encodeURIComponent(search || '')}`)
  return data.countries
}

export async function createCountry(name) {
  const data = await authRequest('/api/countries', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.country
}

export async function fetchCities(search) {
  const data = await authRequest(`/api/cities?search=${encodeURIComponent(search || '')}`)
  return data.cities
}

export async function createCity(name, countryId) {
  const data = await authRequest('/api/cities', {
    method: 'POST',
    body: JSON.stringify({ name, countryId }),
  })
  return data.city
}

export async function fetchSuburbs(cityId, search) {
  const params = new URLSearchParams({ cityId, search: search || '' })
  const data = await authRequest(`/api/suburbs?${params.toString()}`)
  return data.suburbs
}

export async function createSuburb(cityId, name) {
  const data = await authRequest('/api/suburbs', {
    method: 'POST',
    body: JSON.stringify({ name, cityId }),
  })
  return data.suburb
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

export async function fetchVenueTypes(search) {
  const data = await authRequest(`/api/venue-types?search=${encodeURIComponent(search || '')}`)
  return data.venueTypes
}

export async function createVenueType(name) {
  const data = await authRequest('/api/venue-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.venueType
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

export async function verifyVenue(id, verified = true) {
  const data = await authRequest(`/api/venues/${id}/verify`, {
    method: 'PUT',
    body: JSON.stringify({ verified }),
  })
  return data.venue
}

export async function fetchAdminVenues(search) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const data = await authRequest(`/api/admin/venues?${params.toString()}`)
  return data.venues
}

export async function fetchUsers(search) {
  const data = await authRequest(`/api/users?search=${encodeURIComponent(search || '')}`)
  return data.users
}

export async function fetchVenueManagers(venueId) {
  const data = await authRequest(`/api/venues/${venueId}/managers`)
  return data.managers
}

export async function addVenueManager(venueId, userId) {
  const data = await authRequest(`/api/venues/${venueId}/managers`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
  return data.manager
}

export function removeVenueManager(venueId, userId) {
  return authRequest(`/api/venues/${venueId}/managers/${userId}`, {
    method: 'DELETE',
  })
}

export function nominateVenueManager(venueId, message) {
  return authRequest(`/api/venues/${venueId}/nominate-manager`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function fetchVenueManagerNominations() {
  const data = await authRequest('/api/venues/manager-nominations/pending')
  return data.nominations
}

export function approveVenueManagerNomination(id) {
  return authRequest(`/api/venues/manager-nominations/${id}/approve`, { method: 'PUT' })
}

export function declineVenueManagerNomination(id) {
  return authRequest(`/api/venues/manager-nominations/${id}/decline`, { method: 'PUT' })
}

export async function fetchVenueWorkers(venueId) {
  const data = await authRequest(`/api/venues/${venueId}/workers`)
  return data
}

export async function saveVenueAbout(venueId, about) {
  const data = await authRequest(`/api/venues/${venueId}/about`, {
    method: 'PUT',
    body: JSON.stringify({ about }),
  })
  return data.venue
}

export async function postVenueNotice(venueId, content) {
  const data = await authRequest(`/api/venues/${venueId}/notices`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  return data.notice
}

export async function fetchVenueActivity(venueId) {
  const data = await authRequest(`/api/venues/${venueId}/activity`)
  return data.activities
}

export async function discoverPeople(lens) {
  const data = await authRequest(`/api/discover/people?lens=${encodeURIComponent(lens)}`)
  return data.people
}

export async function requestConnection(toUserId) {
  const data = await authRequest('/api/connections/request', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  })
  return data.request
}

export async function fetchConnectionRequests() {
  const data = await authRequest('/api/connections/requests')
  return data.requests
}

export function acceptConnectionRequest(id) {
  return authRequest(`/api/connections/requests/${id}/accept`, { method: 'PUT' })
}

export function declineConnectionRequest(id) {
  return authRequest(`/api/connections/requests/${id}/decline`, { method: 'PUT' })
}

export async function fetchConnections() {
  const data = await authRequest('/api/connections')
  return data.connections
}

export function removeConnection(userId) {
  return authRequest(`/api/connections/${userId}`, { method: 'DELETE' })
}

export async function followVenue(venueId) {
  const data = await authRequest(`/api/venues/${venueId}/follow`, { method: 'POST' })
  return data.isFollowing
}

export async function unfollowVenue(venueId) {
  const data = await authRequest(`/api/venues/${venueId}/follow`, { method: 'DELETE' })
  return data.isFollowing
}

export function favouriteVenue(venueId) {
  return authRequest(`/api/venues/${venueId}/favourite`, { method: 'PUT' })
}

export async function fetchBusinessCategories(search) {
  const data = await authRequest(
    `/api/business-categories?search=${encodeURIComponent(search || '')}`,
  )
  return data.businessCategories
}

export async function createBusinessCategory(name) {
  const data = await authRequest('/api/business-categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.businessCategory
}

export async function fetchBusinesses({ search, sort, status } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (status) params.set('status', status)
  const data = await authRequest(`/api/businesses?${params.toString()}`)
  return data.businesses
}

export async function fetchBusiness(id) {
  const data = await authRequest(`/api/businesses/${id}`)
  return data.business
}

export async function createBusiness(business) {
  const data = await authRequest('/api/businesses', {
    method: 'POST',
    body: JSON.stringify(business),
  })
  return data.business
}

export async function updateBusiness(id, business) {
  const data = await authRequest(`/api/businesses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(business),
  })
  return data.business
}

export async function verifyBusiness(id, verified = true) {
  const data = await authRequest(`/api/businesses/${id}/verify`, {
    method: 'PUT',
    body: JSON.stringify({ verified }),
  })
  return data.business
}

export async function fetchAdminBusinesses(search) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const data = await authRequest(`/api/admin/businesses?${params.toString()}`)
  return data.businesses
}

export async function saveBusinessAbout(id, about) {
  const data = await authRequest(`/api/businesses/${id}/about`, {
    method: 'PUT',
    body: JSON.stringify({ about }),
  })
  return data.business
}

export async function postBusinessNotice(businessId, content) {
  const data = await authRequest(`/api/businesses/${businessId}/notices`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  return data.notice
}

export async function fetchBusinessActivity(businessId) {
  const data = await authRequest(`/api/businesses/${businessId}/activity`)
  return data.activities
}

export async function followBusiness(id) {
  const data = await authRequest(`/api/businesses/${id}/follow`, { method: 'POST' })
  return data.isFollowing
}

export async function unfollowBusiness(id) {
  const data = await authRequest(`/api/businesses/${id}/follow`, { method: 'DELETE' })
  return data.isFollowing
}

export function favouriteBusiness(id) {
  return authRequest(`/api/businesses/${id}/favourite`, { method: 'PUT' })
}

export async function fetchBusinessManagers(businessId) {
  const data = await authRequest(`/api/businesses/${businessId}/managers`)
  return data.managers
}

export async function addBusinessManager(businessId, userId) {
  const data = await authRequest(`/api/businesses/${businessId}/managers`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
  return data.manager
}

export function removeBusinessManager(businessId, userId) {
  return authRequest(`/api/businesses/${businessId}/managers/${userId}`, {
    method: 'DELETE',
  })
}

export function nominateBusinessManager(businessId, message) {
  return authRequest(`/api/businesses/${businessId}/nominate-manager`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function fetchBusinessManagerNominations() {
  const data = await authRequest('/api/businesses/manager-nominations/pending')
  return data.nominations
}

export function approveBusinessManagerNomination(id) {
  return authRequest(`/api/businesses/manager-nominations/${id}/approve`, { method: 'PUT' })
}

export function declineBusinessManagerNomination(id) {
  return authRequest(`/api/businesses/manager-nominations/${id}/decline`, { method: 'PUT' })
}

export function fetchFeed() {
  return authRequest('/api/feed')
}

export async function fetchPosts(cityId) {
  const params = new URLSearchParams()
  if (cityId) params.set('cityId', cityId)
  const data = await authRequest(`/api/posts?${params.toString()}`)
  return data.posts
}

export async function createPost(content) {
  const data = await authRequest('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  return data.post
}

export function deletePost(id) {
  return authRequest(`/api/posts/${id}`, { method: 'DELETE' })
}

export async function fetchAdminUsers(search) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const data = await authRequest(`/api/admin/users?${params.toString()}`)
  return data.users
}

export async function updateUserFlags(userId, flags) {
  const data = await authRequest(`/api/admin/users/${userId}/flags`, {
    method: 'PUT',
    body: JSON.stringify(flags),
  })
  return data.user
}

export async function blockUser(userId) {
  const data = await authRequest(`/api/admin/users/${userId}/block`, { method: 'PUT' })
  return data.user
}

export async function unblockUser(userId) {
  const data = await authRequest(`/api/admin/users/${userId}/unblock`, { method: 'PUT' })
  return data.user
}
