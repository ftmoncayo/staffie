const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { sanitize } = require('../lib/sanitizeHtml')

const router = express.Router()
router.use(requireAuth)

const businessInclude = {
  category: true,
  country: true,
  locations: { include: { city: true } },
}

function mapBusiness(business) {
  return business ? { ...business, about: sanitize(business.about) } : business
}

const LOCATION_SCOPES = ['SPECIFIC_CITIES', 'COUNTRY', 'GLOBAL']

async function resolveLocation(req, res) {
  const { locationScope, cityIds, countryId } = req.body || {}
  const scope = LOCATION_SCOPES.includes(locationScope) ? locationScope : 'SPECIFIC_CITIES'

  if (scope === 'GLOBAL') {
    return { ok: true, scope, countryId: null, cityIds: [] }
  }

  if (scope === 'COUNTRY') {
    if (typeof countryId !== 'string' || !countryId.trim()) {
      res.status(400).json({ error: 'Select a country' })
      return { ok: false }
    }
    const country = await prisma.country.findUnique({ where: { id: countryId.trim() } })
    if (!country) {
      res.status(400).json({ error: 'Selected country was not found' })
      return { ok: false }
    }
    return { ok: true, scope, countryId: country.id, cityIds: [] }
  }

  const ids = Array.isArray(cityIds) ? cityIds.filter((id) => typeof id === 'string' && id.trim()) : []
  if (ids.length === 0) {
    res.status(400).json({ error: 'Select at least one city' })
    return { ok: false }
  }
  const cities = await prisma.city.findMany({ where: { id: { in: ids } } })
  if (cities.length !== ids.length) {
    res.status(400).json({ error: 'One or more selected cities were not found' })
    return { ok: false }
  }
  return { ok: true, scope, countryId: null, cityIds: cities.map((c) => c.id) }
}

async function canEditBusiness(userId, businessId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.isAdmin) return true

  const manager = await prisma.businessManager.findUnique({
    where: { businessId_userId: { businessId, userId } },
  })
  return Boolean(manager)
}

async function isFollowingBusiness(userId, businessId) {
  const follow = await prisma.businessFollow.findUnique({
    where: { userId_businessId: { userId, businessId } },
  })
  return Boolean(follow)
}

async function requireBusinessEditor(req, res, next) {
  const allowed = await canEditBusiness(req.userId, req.params.id)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to edit this business' })
  }
  next()
}

router.get('/businesses', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const sort = req.query.sort === 'name_asc' ? 'name_asc' : 'createdAt_desc'
  const status = req.query.status === 'UNVERIFIED' || req.query.status === 'VERIFIED'
    ? req.query.status
    : undefined

  const where = {
    ...(status ? { verificationStatus: status } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  }

  const businesses = await prisma.business.findMany({
    where,
    include: businessInclude,
    orderBy: sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' },
  })

  res.json({ businesses: businesses.map(mapBusiness) })
})

router.get('/businesses/:id', async (req, res) => {
  const business = await prisma.business.findUnique({
    where: { id: req.params.id },
    include: businessInclude,
  })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }
  const canEdit = await canEditBusiness(req.userId, business.id)
  const isFollowing = await isFollowingBusiness(req.userId, business.id)
  res.json({ business: { ...mapBusiness(business), canEdit, isFollowing } })
})

router.post('/businesses', async (req, res) => {
  const { name, categoryId, about } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Business name is required' })
  }

  let validatedCategoryId = null
  if (typeof categoryId === 'string' && categoryId.trim()) {
    const category = await prisma.businessCategory.findUnique({ where: { id: categoryId.trim() } })
    if (!category) {
      return res.status(400).json({ error: 'Selected category was not found' })
    }
    validatedCategoryId = category.id
  }

  const location = await resolveLocation(req, res)
  if (!location.ok) return

  const business = await prisma.business.create({
    data: {
      name: name.trim(),
      categoryId: validatedCategoryId,
      about: sanitize(about),
      createdByUserId: req.userId,
      locationScope: location.scope,
      countryId: location.countryId,
      locations: location.cityIds.length
        ? { create: location.cityIds.map((cityId) => ({ cityId })) }
        : undefined,
    },
    include: businessInclude,
  })

  res.status(201).json({ business: mapBusiness(business) })
})

router.put('/businesses/:id', requireBusinessEditor, async (req, res) => {
  const existing = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const { name, categoryId } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Business name is required' })
  }

  let validatedCategoryId = null
  if (typeof categoryId === 'string' && categoryId.trim()) {
    const category = await prisma.businessCategory.findUnique({ where: { id: categoryId.trim() } })
    if (!category) {
      return res.status(400).json({ error: 'Selected category was not found' })
    }
    validatedCategoryId = category.id
  }

  const location = await resolveLocation(req, res)
  if (!location.ok) return

  const business = await prisma.$transaction(async (tx) => {
    await tx.businessLocation.deleteMany({ where: { businessId: existing.id } })
    return tx.business.update({
      where: { id: existing.id },
      data: {
        name: name.trim(),
        categoryId: validatedCategoryId,
        locationScope: location.scope,
        countryId: location.countryId,
        locations: location.cityIds.length
          ? { create: location.cityIds.map((cityId) => ({ cityId })) }
          : undefined,
      },
      include: businessInclude,
    })
  })

  const canEdit = await canEditBusiness(req.userId, business.id)
  res.json({ business: { ...mapBusiness(business), canEdit } })
})

router.put('/businesses/:id/verify', requireAdmin, async (req, res) => {
  const existing = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const business = await prisma.business.update({
    where: { id: existing.id },
    data: { verificationStatus: 'VERIFIED' },
    include: businessInclude,
  })

  await prisma.activity.create({ data: { type: 'BUSINESS_VERIFIED', businessId: business.id } })

  const canEdit = await canEditBusiness(req.userId, business.id)
  res.json({ business: { ...mapBusiness(business), canEdit } })
})

router.put('/businesses/:id/about', requireBusinessEditor, async (req, res) => {
  const existing = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const { about } = req.body || {}

  const business = await prisma.business.update({
    where: { id: existing.id },
    data: { about: sanitize(about) },
    include: businessInclude,
  })

  const canEdit = await canEditBusiness(req.userId, business.id)
  res.json({ business: { ...mapBusiness(business), canEdit } })
})

router.post('/businesses/:id/follow', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  await prisma.businessFollow.upsert({
    where: { userId_businessId: { userId: req.userId, businessId: business.id } },
    create: { userId: req.userId, businessId: business.id },
    update: {},
  })

  res.status(201).json({ isFollowing: true })
})

router.delete('/businesses/:id/follow', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  await prisma.businessFollow.deleteMany({ where: { userId: req.userId, businessId: business.id } })

  res.json({ isFollowing: false })
})

router.put('/businesses/:id/favourite', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const existing = await prisma.businessFollow.findUnique({
    where: { userId_businessId: { userId: req.userId, businessId: business.id } },
  })

  const follow = await prisma.businessFollow.upsert({
    where: { userId_businessId: { userId: req.userId, businessId: business.id } },
    create: { userId: req.userId, businessId: business.id, isFavourite: true },
    update: { isFavourite: !existing?.isFavourite },
  })

  res.json({ isFollowing: true, isFavourite: follow.isFavourite })
})

// --- Business managers (admin-only) ---

router.get('/businesses/:id/managers', requireAdmin, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const managers = await prisma.businessManager.findMany({
    where: { businessId: business.id },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { assignedAt: 'desc' },
  })

  res.json({ managers })
})

router.post('/businesses/:id/managers', requireAdmin, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const { userId } = req.body || {}
  if (typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId.trim() } })
  if (!user) {
    return res.status(400).json({ error: 'Selected user was not found' })
  }

  const existingManager = await prisma.businessManager.findUnique({
    where: { businessId_userId: { businessId: business.id, userId: user.id } },
  })
  if (existingManager) {
    return res.status(409).json({ error: 'User is already a manager for this business' })
  }

  const manager = await prisma.businessManager.create({
    data: { businessId: business.id, userId: user.id, assignedByUserId: req.userId },
    include: { user: { select: { id: true, email: true } } },
  })

  res.status(201).json({ manager })
})

router.delete('/businesses/:id/managers/:userId', requireAdmin, async (req, res) => {
  const existingManager = await prisma.businessManager.findUnique({
    where: { businessId_userId: { businessId: req.params.id, userId: req.params.userId } },
  })
  if (!existingManager) {
    return res.status(404).json({ error: 'Manager assignment not found' })
  }

  await prisma.businessManager.delete({ where: { id: existingManager.id } })
  res.status(204).end()
})

// --- Manager nominations (self-nomination, admin approval) ---

router.post('/businesses/:id/nominate-manager', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } })
  if (!business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const { message } = req.body || {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please include a message with your contact details' })
  }

  const alreadyManager = await prisma.businessManager.findUnique({
    where: { businessId_userId: { businessId: business.id, userId: req.userId } },
  })
  if (alreadyManager) {
    return res.status(400).json({ error: 'You already manage this business' })
  }

  const existingPending = await prisma.managerNomination.findFirst({
    where: { targetType: 'BUSINESS', targetId: business.id, nomineeUserId: req.userId, status: 'PENDING' },
  })
  if (existingPending) {
    return res.status(409).json({ error: 'You already have a pending request for this business' })
  }

  const nomination = await prisma.managerNomination.create({
    data: { targetType: 'BUSINESS', targetId: business.id, nomineeUserId: req.userId, message: message.trim() },
  })

  res.status(201).json({ nomination })
})

router.get('/businesses/manager-nominations/pending', requireAdmin, async (req, res) => {
  const nominations = await prisma.managerNomination.findMany({
    where: { targetType: 'BUSINESS', status: 'PENDING' },
    include: { nomineeUser: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const businessIds = [...new Set(nominations.map((n) => n.targetId))]
  const businesses = businessIds.length
    ? await prisma.business.findMany({ where: { id: { in: businessIds } }, select: { id: true, name: true } })
    : []
  const businessById = new Map(businesses.map((b) => [b.id, b]))

  res.json({
    nominations: nominations.map((n) => ({
      id: n.id,
      message: n.message,
      createdAt: n.createdAt,
      nominee: n.nomineeUser,
      target: businessById.get(n.targetId) || null,
    })),
  })
})

router.put('/businesses/manager-nominations/:nominationId/approve', requireAdmin, async (req, res) => {
  const nomination = await prisma.managerNomination.findUnique({ where: { id: req.params.nominationId } })
  if (!nomination || nomination.targetType !== 'BUSINESS') {
    return res.status(404).json({ error: 'Nomination not found' })
  }
  if (nomination.status !== 'PENDING') {
    return res.status(409).json({ error: 'Nomination has already been resolved' })
  }

  const existingManager = await prisma.businessManager.findUnique({
    where: { businessId_userId: { businessId: nomination.targetId, userId: nomination.nomineeUserId } },
  })
  if (!existingManager) {
    await prisma.businessManager.create({
      data: { businessId: nomination.targetId, userId: nomination.nomineeUserId, assignedByUserId: req.userId },
    })
  }

  const updated = await prisma.managerNomination.update({
    where: { id: nomination.id },
    data: { status: 'APPROVED', respondedByUserId: req.userId, respondedAt: new Date() },
  })

  res.json({ nomination: updated })
})

router.put('/businesses/manager-nominations/:nominationId/decline', requireAdmin, async (req, res) => {
  const nomination = await prisma.managerNomination.findUnique({ where: { id: req.params.nominationId } })
  if (!nomination || nomination.targetType !== 'BUSINESS') {
    return res.status(404).json({ error: 'Nomination not found' })
  }
  if (nomination.status !== 'PENDING') {
    return res.status(409).json({ error: 'Nomination has already been resolved' })
  }

  const updated = await prisma.managerNomination.update({
    where: { id: nomination.id },
    data: { status: 'DECLINED', respondedByUserId: req.userId, respondedAt: new Date() },
  })

  res.json({ nomination: updated })
})

module.exports = router
