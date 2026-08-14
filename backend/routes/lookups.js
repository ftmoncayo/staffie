const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const SEARCH_LIMIT = 20

function searchFilter(search) {
  return search ? { name: { contains: search, mode: 'insensitive' } } : undefined
}

function getSearch(req) {
  return typeof req.query.search === 'string' ? req.query.search.trim() : ''
}

function validateName(req, res) {
  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' })
    return null
  }
  return name.trim()
}

// --- Cities ---

router.get('/cities', async (req, res) => {
  const cities = await prisma.city.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ cities })
})

router.post('/cities', async (req, res) => {
  const name = validateName(req, res)
  if (!name) return

  const city = await prisma.city.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json({ city })
})

// --- Skills ---

router.get('/skills', async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ skills })
})

// --- Knowledge areas ---

router.get('/knowledge-areas', async (req, res) => {
  const knowledgeAreas = await prisma.knowledgeArea.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ knowledgeAreas })
})

// --- Certification types ---

router.get('/certification-types', async (req, res) => {
  const certificationTypes = await prisma.certificationType.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ certificationTypes })
})

router.post('/certification-types', async (req, res) => {
  const name = validateName(req, res)
  if (!name) return

  const certificationType = await prisma.certificationType.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json({ certificationType })
})

// --- Venue specialties ---

router.get('/venue-specialties', async (req, res) => {
  const venueSpecialties = await prisma.venueSpecialty.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ venueSpecialties })
})

router.post('/venue-specialties', async (req, res) => {
  const name = validateName(req, res)
  if (!name) return

  const venueSpecialty = await prisma.venueSpecialty.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json({ venueSpecialty })
})

// --- Venue types ---

router.get('/venue-types', async (req, res) => {
  const venueTypes = await prisma.venueType.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ venueTypes })
})

router.post('/venue-types', async (req, res) => {
  const name = validateName(req, res)
  if (!name) return

  const venueType = await prisma.venueType.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json({ venueType })
})

// --- Suburbs (scoped to a city) ---

router.get('/suburbs', async (req, res) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId.trim() : ''
  if (!cityId) {
    return res.status(400).json({ error: 'cityId is required' })
  }

  const suburbs = await prisma.suburb.findMany({
    where: { cityId, ...searchFilter(getSearch(req)) },
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ suburbs })
})

router.post('/suburbs', async (req, res) => {
  const { name, cityId } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Suburb name is required' })
  }
  if (typeof cityId !== 'string' || !cityId.trim()) {
    return res.status(400).json({ error: 'cityId is required' })
  }

  const city = await prisma.city.findUnique({ where: { id: cityId.trim() } })
  if (!city) {
    return res.status(400).json({ error: 'Selected city was not found' })
  }

  const trimmedName = name.trim()
  const suburb = await prisma.suburb.upsert({
    where: { name_cityId: { name: trimmedName, cityId: city.id } },
    create: { name: trimmedName, cityId: city.id },
    update: {},
  })
  res.status(201).json({ suburb })
})

module.exports = router
