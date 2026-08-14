const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const venueInclude = {
  city: true,
  venueType: true,
  specialties: true,
}

function parseSpecialtyIds(specialtyIds) {
  if (!Array.isArray(specialtyIds)) return []
  return specialtyIds.filter((id) => typeof id === 'string' && id.trim())
}

async function validateSpecialtyIds(specialtyIds) {
  if (specialtyIds.length === 0) return []
  const found = await prisma.venueSpecialty.findMany({
    where: { id: { in: specialtyIds } },
  })
  return found.map((s) => s.id)
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

router.get('/venues', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const sort = req.query.sort === 'name_asc' ? 'name_asc' : 'createdAt_desc'
  const status = req.query.status === 'UNVERIFIED' || req.query.status === 'VERIFIED'
    ? req.query.status
    : undefined

  const where = {
    ...(status ? { verificationStatus: status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const venues = await prisma.venue.findMany({
    where,
    include: venueInclude,
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
  })

  res.json({ venues })
})

router.get('/venues/:id', async (req, res) => {
  const venue = await prisma.venue.findUnique({
    where: { id: req.params.id },
    include: venueInclude,
  })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }
  res.json({ venue })
})

router.post('/venues', async (req, res) => {
  const { name, cityId, state, country, venueTypeId, specialtyIds } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Venue name is required' })
  }

  let validatedCityId = null
  if (typeof cityId === 'string' && cityId.trim()) {
    const city = await prisma.city.findUnique({ where: { id: cityId.trim() } })
    if (!city) {
      return res.status(400).json({ error: 'Selected city was not found' })
    }
    validatedCityId = city.id
  }

  let validatedVenueTypeId = null
  if (typeof venueTypeId === 'string' && venueTypeId.trim()) {
    const venueType = await prisma.venueType.findUnique({ where: { id: venueTypeId.trim() } })
    if (!venueType) {
      return res.status(400).json({ error: 'Selected venue type was not found' })
    }
    validatedVenueTypeId = venueType.id
  }

  const validSpecialtyIds = await validateSpecialtyIds(parseSpecialtyIds(specialtyIds))

  const venue = await prisma.venue.create({
    data: {
      name: name.trim(),
      cityId: validatedCityId,
      state: optionalString(state),
      country: optionalString(country),
      venueTypeId: validatedVenueTypeId,
      createdByUserId: req.userId,
      specialties: { connect: validSpecialtyIds.map((id) => ({ id })) },
    },
    include: venueInclude,
  })

  res.status(201).json({ venue })
})

router.put('/venues/:id', async (req, res) => {
  const existing = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { name, cityId, state, country, venueTypeId, specialtyIds } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Venue name is required' })
  }

  let validatedCityId = null
  if (typeof cityId === 'string' && cityId.trim()) {
    const city = await prisma.city.findUnique({ where: { id: cityId.trim() } })
    if (!city) {
      return res.status(400).json({ error: 'Selected city was not found' })
    }
    validatedCityId = city.id
  }

  let validatedVenueTypeId = null
  if (typeof venueTypeId === 'string' && venueTypeId.trim()) {
    const venueType = await prisma.venueType.findUnique({ where: { id: venueTypeId.trim() } })
    if (!venueType) {
      return res.status(400).json({ error: 'Selected venue type was not found' })
    }
    validatedVenueTypeId = venueType.id
  }

  const validSpecialtyIds = await validateSpecialtyIds(parseSpecialtyIds(specialtyIds))

  const venue = await prisma.venue.update({
    where: { id: existing.id },
    data: {
      name: name.trim(),
      cityId: validatedCityId,
      state: optionalString(state),
      country: optionalString(country),
      venueTypeId: validatedVenueTypeId,
      specialties: { set: validSpecialtyIds.map((id) => ({ id })) },
    },
    include: venueInclude,
  })

  res.json({ venue })
})

router.put('/venues/:id/verify', requireAdmin, async (req, res) => {
  const existing = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const venue = await prisma.venue.update({
    where: { id: existing.id },
    data: { verificationStatus: 'VERIFIED' },
    include: venueInclude,
  })

  res.json({ venue })
})

module.exports = router
