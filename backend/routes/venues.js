const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin, requireAdminOrVenueAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const venueInclude = {
  city: true,
  suburb: true,
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

async function validateSuburbId(suburbId, cityId) {
  if (typeof suburbId !== 'string' || !suburbId.trim()) {
    return { ok: true, suburbId: null }
  }
  const suburb = await prisma.suburb.findUnique({ where: { id: suburbId.trim() } })
  if (!suburb) {
    return { ok: false, error: 'Selected suburb was not found' }
  }
  if (cityId && suburb.cityId !== cityId) {
    return { ok: false, error: 'Selected suburb does not belong to the selected city' }
  }
  return { ok: true, suburbId: suburb.id }
}

async function canEditVenue(userId, venueId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.isAdmin || user?.isVenueAdmin) return true

  const manager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId, userId } },
  })
  return Boolean(manager)
}

async function requireVenueEditor(req, res, next) {
  const allowed = await canEditVenue(req.userId, req.params.id)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to edit this venue' })
  }
  next()
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
  const canEdit = await canEditVenue(req.userId, venue.id)
  res.json({ venue: { ...venue, canEdit } })
})

router.post('/venues', async (req, res) => {
  const { name, cityId, suburbId, state, country, venueTypeId, specialtyIds } = req.body || {}

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

  const suburbResult = await validateSuburbId(suburbId, validatedCityId)
  if (!suburbResult.ok) {
    return res.status(400).json({ error: suburbResult.error })
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
      suburbId: suburbResult.suburbId,
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

router.put('/venues/:id', requireVenueEditor, async (req, res) => {
  const existing = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { name, cityId, suburbId, state, country, venueTypeId, specialtyIds } = req.body || {}

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

  const suburbResult = await validateSuburbId(suburbId, validatedCityId)
  if (!suburbResult.ok) {
    return res.status(400).json({ error: suburbResult.error })
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
      suburbId: suburbResult.suburbId,
      state: optionalString(state),
      country: optionalString(country),
      venueTypeId: validatedVenueTypeId,
      specialties: { set: validSpecialtyIds.map((id) => ({ id })) },
    },
    include: venueInclude,
  })

  const canEdit = await canEditVenue(req.userId, venue.id)
  res.json({ venue: { ...venue, canEdit } })
})

router.put('/venues/:id/verify', requireAdminOrVenueAdmin, async (req, res) => {
  const existing = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const venue = await prisma.venue.update({
    where: { id: existing.id },
    data: { verificationStatus: 'VERIFIED' },
    include: venueInclude,
  })

  const canEdit = await canEditVenue(req.userId, venue.id)
  res.json({ venue: { ...venue, canEdit } })
})

router.get('/venues/:id/workers', async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const experiences = await prisma.experience.findMany({
    where: { venueId: venue.id },
    include: { profile: { include: { user: true, city: true } } },
    distinct: ['profileId'],
  })

  const workers = experiences.map((e) => ({
    id: e.profile.user.id,
    email: e.profile.user.email,
    profile: {
      firstName: e.profile.firstName,
      lastName: e.profile.lastName,
      professionalTitle: e.profile.professionalTitle,
      city: e.profile.city,
    },
  }))

  res.json({ workers })
})

// --- Venue managers (admin-only) ---

router.get('/venues/:id/managers', requireAdmin, async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const managers = await prisma.venueManager.findMany({
    where: { venueId: venue.id },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { assignedAt: 'desc' },
  })

  res.json({ managers })
})

router.post('/venues/:id/managers', requireAdmin, async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { userId } = req.body || {}
  if (typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId.trim() } })
  if (!user) {
    return res.status(400).json({ error: 'Selected user was not found' })
  }

  const existingManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: venue.id, userId: user.id } },
  })
  if (existingManager) {
    return res.status(409).json({ error: 'User is already a manager for this venue' })
  }

  const manager = await prisma.venueManager.create({
    data: { venueId: venue.id, userId: user.id, assignedByUserId: req.userId },
    include: { user: { select: { id: true, email: true } } },
  })

  res.status(201).json({ manager })
})

router.delete('/venues/:id/managers/:userId', requireAdmin, async (req, res) => {
  const existingManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: req.params.id, userId: req.params.userId } },
  })
  if (!existingManager) {
    return res.status(404).json({ error: 'Manager assignment not found' })
  }

  await prisma.venueManager.delete({ where: { id: existingManager.id } })
  res.status(204).end()
})

module.exports = router
