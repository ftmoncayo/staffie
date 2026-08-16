const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdminOrVenueAdmin } = require('../middleware/auth')
const { sanitize } = require('../lib/sanitizeHtml')
const { buildConnectionStatusMap, connectionStatusFor } = require('../lib/connectionStatus')
const { displayName } = require('../lib/displayName')
const { formatActivities } = require('../lib/activityFeed')
const { sendInvite } = require('../lib/invites')

const router = express.Router()
router.use(requireAuth)

const venueInclude = {
  city: true,
  suburb: true,
  venueType: true,
  specialties: true,
  _count: { select: { managers: true } },
}

function mapVenue(venue) {
  if (!venue) return venue
  const { _count, ...rest } = venue
  return { ...rest, about: sanitize(venue.about), managerCount: _count?.managers ?? 0 }
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

async function isFollowingVenue(userId, venueId) {
  const follow = await prisma.venueFollow.findUnique({
    where: { userId_venueId: { userId, venueId } },
  })
  return Boolean(follow)
}

async function requireVenueEditor(req, res, next) {
  const allowed = await canEditVenue(req.userId, req.params.id)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to edit this venue' })
  }
  next()
}

async function isVenueManager(userId, venueId) {
  const manager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId, userId } },
  })
  return Boolean(manager)
}

async function requireVenueManager(req, res, next) {
  const allowed = await isVenueManager(req.userId, req.params.id)
  if (!allowed) {
    return res.status(403).json({ error: 'Only assigned managers can post notices for this venue' })
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

  res.json({ venues: venues.map(mapVenue) })
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
  const isFollowing = await isFollowingVenue(req.userId, venue.id)
  const isManager = await isVenueManager(req.userId, venue.id)
  const hasExperienceHere = Boolean(
    await prisma.experience.findFirst({ where: { venueId: venue.id, profile: { userId: req.userId } } }),
  )
  res.json({ venue: { ...mapVenue(venue), canEdit, isFollowing, isManager, hasExperienceHere } })
})

router.post('/venues', async (req, res) => {
  const { name, cityId, suburbId, state, country, venueTypeId, specialtyIds, isManager, managerEmail } =
    req.body || {}

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

  if (isManager === true) {
    await prisma.venueManager.create({
      data: { venueId: venue.id, userId: req.userId, assignedByUserId: req.userId, verified: false },
    })
    await prisma.managerNomination.create({
      data: {
        targetType: 'VENUE',
        targetId: venue.id,
        nomineeUserId: req.userId,
        message: 'Declared themselves as manager while creating this venue.',
      },
    })
  } else if (typeof managerEmail === 'string' && managerEmail.trim()) {
    sendInvite({
      inviterUserId: req.userId,
      inviteeEmail: managerEmail,
      type: 'VENUE_MANAGER_NUDGE',
      venueId: venue.id,
    }).catch((err) => console.error('Failed to send venue manager nudge invite:', err))
  }

  await prisma.activity.create({ data: { type: 'VENUE_CREATED', actorUserId: req.userId } })

  res.status(201).json({ venue: mapVenue(venue) })
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
  const isManager = await isVenueManager(req.userId, venue.id)
  res.json({ venue: { ...mapVenue(venue), canEdit, isManager } })
})

router.put('/venues/:id/verify', requireAdminOrVenueAdmin, async (req, res) => {
  const existing = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { verified } = req.body || {}
  const nextStatus = verified === false ? 'UNVERIFIED' : 'VERIFIED'

  const venue = await prisma.venue.update({
    where: { id: existing.id },
    data: { verificationStatus: nextStatus },
    include: venueInclude,
  })


  const canEdit = await canEditVenue(req.userId, venue.id)
  res.json({ venue: { ...mapVenue(venue), canEdit } })
})

router.put('/venues/:id/about', requireVenueEditor, async (req, res) => {
  const existing = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { about } = req.body || {}

  const venue = await prisma.venue.update({
    where: { id: existing.id },
    data: { about: sanitize(about) },
    include: venueInclude,
  })

  const canEdit = await canEditVenue(req.userId, venue.id)
  const isManager = await isVenueManager(req.userId, venue.id)
  res.json({ venue: { ...mapVenue(venue), canEdit, isManager } })
})

router.get('/venues/:id/workers', async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const experiences = await prisma.experience.findMany({
    where: { venueId: venue.id },
    include: { profile: { include: { user: true, city: true } } },
    orderBy: { startDate: 'desc' },
  })

  const byProfile = new Map()
  for (const exp of experiences) {
    if (!byProfile.has(exp.profileId)) byProfile.set(exp.profileId, [])
    byProfile.get(exp.profileId).push(exp)
  }

  const statusMap = await buildConnectionStatusMap(req.userId)

  const current = []
  const previous = []

  for (const exps of byProfile.values()) {
    const currentExp = exps.find((e) => e.isCurrent || !e.endDate)
    const mostRecent = exps.reduce((latest, e) =>
      !latest || (e.endDate && (!latest.endDate || e.endDate > latest.endDate)) ? e : latest,
    exps[0])
    const chosen = currentExp || mostRecent

    const worker = {
      id: chosen.profile.user.id,
      email: chosen.profile.user.email,
      profile: {
        firstName: chosen.profile.firstName,
        lastName: chosen.profile.lastName,
        professionalTitle: chosen.profile.professionalTitle,
        city: chosen.profile.city,
      },
      roleTitle: chosen.roleTitle,
      ...connectionStatusFor(statusMap, chosen.profile.user.id),
      isSelf: chosen.profile.user.id === req.userId,
    }

    if (currentExp) {
      current.push(worker)
    } else {
      previous.push({ ...worker, endDate: chosen.endDate })
    }
  }

  current.sort((a, b) => (a.profile.firstName || '').localeCompare(b.profile.firstName || ''))
  previous.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))

  res.json({ current, previous })
})

router.post('/venues/:id/follow', async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  await prisma.venueFollow.upsert({
    where: { userId_venueId: { userId: req.userId, venueId: venue.id } },
    create: { userId: req.userId, venueId: venue.id },
    update: {},
  })

  res.status(201).json({ isFollowing: true })
})

router.delete('/venues/:id/follow', async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  await prisma.venueFollow.deleteMany({ where: { userId: req.userId, venueId: venue.id } })

  res.json({ isFollowing: false })
})

router.put('/venues/:id/favourite', async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const existing = await prisma.venueFollow.findUnique({
    where: { userId_venueId: { userId: req.userId, venueId: venue.id } },
  })

  const follow = await prisma.venueFollow.upsert({
    where: { userId_venueId: { userId: req.userId, venueId: venue.id } },
    create: { userId: req.userId, venueId: venue.id, isFavourite: true },
    update: { isFavourite: !existing?.isFavourite },
  })

  res.json({ isFollowing: true, isFavourite: follow.isFavourite })
})

// --- Notices & activity ---

router.post('/venues/:id/notices', requireVenueManager, async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { content } = req.body || {}
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Notice content is required' })
  }

  const notice = await prisma.notice.create({
    data: { targetType: 'VENUE', targetId: venue.id, authorUserId: req.userId, content: content.trim() },
  })

  await prisma.activity.create({
    data: { type: 'NOTICE_POSTED', actorUserId: req.userId, venueId: venue.id, noticeId: notice.id },
  })

  res.status(201).json({ notice })
})

router.get('/venues/:id/activity', async (req, res) => {
  const activities = await prisma.activity.findMany({
    where: { venueId: req.params.id },
    include: {
      actorUser: { include: { profile: { include: { city: true } } } },
      venue: { select: { id: true, name: true } },
      business: { select: { id: true, name: true } },
      notice: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json({ activities: await formatActivities(activities) })
})

// --- Admin listing (admin or venue-admin) ---

router.get('/admin/venues', requireAdminOrVenueAdmin, async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  const venues = await prisma.venue.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { name: { contains: search, mode: 'insensitive' } } },
            { suburb: { name: { contains: search, mode: 'insensitive' } } },
            { venueType: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    include: {
      city: true,
      suburb: true,
      venueType: true,
      managers: { include: { user: { include: { profile: true } } } },
      followers: true,
      experiences: { select: { profileId: true, isCurrent: true, endDate: true } },
    },
    orderBy: { name: 'asc' },
  })

  res.json({
    venues: venues.map((v) => {
      const employeesByProfile = new Map()
      for (const e of v.experiences) {
        if (!employeesByProfile.has(e.profileId)) employeesByProfile.set(e.profileId, [])
        employeesByProfile.get(e.profileId).push(e)
      }
      let currentEmployeeCount = 0
      let previousEmployeeCount = 0
      for (const exps of employeesByProfile.values()) {
        if (exps.some((e) => e.isCurrent || !e.endDate)) currentEmployeeCount += 1
        else previousEmployeeCount += 1
      }

      return {
        id: v.id,
        name: v.name,
        verificationStatus: v.verificationStatus,
        city: v.city,
        suburb: v.suburb,
        venueType: v.venueType,
        managerCount: v.managers.length,
        followerCount: v.followers.length,
        favouriteCount: v.followers.filter((f) => f.isFavourite).length,
        currentEmployeeCount,
        previousEmployeeCount,
        managers: v.managers.map((m) => ({ id: m.user.id, name: displayName(m.user), verified: m.verified })),
      }
    }),
  })
})

// --- Venue managers (admin or venue-admin) ---

router.get('/venues/:id/managers', requireAdminOrVenueAdmin, async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const managers = await prisma.venueManager.findMany({
    where: { venueId: venue.id },
    include: { user: { select: { id: true, email: true, profile: true } } },
    orderBy: { assignedAt: 'desc' },
  })

  res.json({ managers })
})

router.post('/venues/:id/managers', requireAdminOrVenueAdmin, async (req, res) => {
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

router.delete('/venues/:id/managers/:userId', requireAdminOrVenueAdmin, async (req, res) => {
  const existingManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: req.params.id, userId: req.params.userId } },
  })
  if (!existingManager) {
    return res.status(404).json({ error: 'Manager assignment not found' })
  }

  await prisma.venueManager.delete({ where: { id: existingManager.id } })
  res.status(204).end()
})

// --- Manager nominations (self-nomination, admin/venue-admin/existing-manager approval) ---

router.post('/venues/:id/nominate-manager', async (req, res) => {
  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } })
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' })
  }

  const { message } = req.body || {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please include a message with your contact details' })
  }

  const alreadyManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: venue.id, userId: req.userId } },
  })
  if (alreadyManager) {
    return res.status(400).json({ error: 'You already manage this venue' })
  }

  const existingPending = await prisma.managerNomination.findFirst({
    where: { targetType: 'VENUE', targetId: venue.id, nomineeUserId: req.userId, status: 'PENDING' },
  })
  if (existingPending) {
    return res.status(409).json({ error: 'You already have a pending request for this venue' })
  }

  const nomination = await prisma.managerNomination.create({
    data: { targetType: 'VENUE', targetId: venue.id, nomineeUserId: req.userId, message: message.trim() },
  })

  res.status(201).json({ nomination })
})

router.get('/venues/manager-nominations/pending', requireAdminOrVenueAdmin, async (req, res) => {
  const nominations = await prisma.managerNomination.findMany({
    where: { targetType: 'VENUE', status: 'PENDING' },
    include: { nomineeUser: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const venueIds = [...new Set(nominations.map((n) => n.targetId))]
  const venues = venueIds.length
    ? await prisma.venue.findMany({ where: { id: { in: venueIds } }, select: { id: true, name: true } })
    : []
  const venueById = new Map(venues.map((v) => [v.id, v]))

  res.json({
    nominations: nominations.map((n) => ({
      id: n.id,
      message: n.message,
      createdAt: n.createdAt,
      nominee: n.nomineeUser,
      target: venueById.get(n.targetId) || null,
    })),
  })
})

router.put('/venues/manager-nominations/:nominationId/approve', async (req, res) => {
  const nomination = await prisma.managerNomination.findUnique({ where: { id: req.params.nominationId } })
  if (!nomination || nomination.targetType !== 'VENUE') {
    return res.status(404).json({ error: 'Nomination not found' })
  }
  if (nomination.status !== 'PENDING') {
    return res.status(409).json({ error: 'Nomination has already been resolved' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  const approverManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: nomination.targetId, userId: req.userId } },
  })
  const allowed = user?.isAdmin || user?.isVenueAdmin || Boolean(approverManager?.verified)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to approve this nomination' })
  }

  const existingManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: nomination.targetId, userId: nomination.nomineeUserId } },
  })
  if (existingManager) {
    await prisma.venueManager.update({ where: { id: existingManager.id }, data: { verified: true } })
  } else {
    await prisma.venueManager.create({
      data: { venueId: nomination.targetId, userId: nomination.nomineeUserId, assignedByUserId: req.userId },
    })
  }

  const updated = await prisma.managerNomination.update({
    where: { id: nomination.id },
    data: { status: 'APPROVED', respondedByUserId: req.userId, respondedAt: new Date() },
  })

  res.json({ nomination: updated })
})

router.put('/venues/manager-nominations/:nominationId/decline', requireAdminOrVenueAdmin, async (req, res) => {
  const nomination = await prisma.managerNomination.findUnique({ where: { id: req.params.nominationId } })
  if (!nomination || nomination.targetType !== 'VENUE') {
    return res.status(404).json({ error: 'Nomination not found' })
  }
  if (nomination.status !== 'PENDING') {
    return res.status(409).json({ error: 'Nomination has already been resolved' })
  }

  const existingManager = await prisma.venueManager.findUnique({
    where: { venueId_userId: { venueId: nomination.targetId, userId: nomination.nomineeUserId } },
  })
  if (existingManager) {
    await prisma.venueManager.delete({ where: { id: existingManager.id } })
  }

  const updated = await prisma.managerNomination.update({
    where: { id: nomination.id },
    data: { status: 'DECLINED', respondedByUserId: req.userId, respondedAt: new Date() },
  })

  res.json({ nomination: updated })
})

module.exports = router
