const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { sanitize } = require('../lib/sanitizeHtml')
const {
  buildConnectionStatusMap,
  connectionStatusFor,
  buildConnectionsAdjacency,
} = require('../lib/connectionStatus')
const { formatActivities } = require('../lib/activityFeed')

const router = express.Router()
router.use(requireAuth)

const ACTIVITY_LIMIT = 50

const profileInclude = {
  city: { include: { state: { include: { country: true } } } },
  suburb: true,
  skills: true,
  knowledgeAreas: true,
  experiences: {
    orderBy: { startDate: 'desc' },
    include: { venue: { include: { city: true } } },
  },
  certifications: {
    orderBy: { issueDate: 'desc' },
    include: { certificationType: true },
  },
}

async function getOwnedProfile(userId) {
  const profile = await prisma.profile.findUnique({ where: { userId }, include: profileInclude })
  return profile ? { ...profile, about: sanitize(profile.about) } : profile
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function requesterIsAdmin(userId) {
  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  return Boolean(requester?.isAdmin)
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

async function requireProfile(req, res, next) {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId } })
  if (!profile) {
    return res.status(404).json({ error: 'Create your profile before adding this' })
  }
  req.profile = profile
  next()
}

router.get('/', async (req, res) => {
  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

router.put('/', async (req, res) => {
  const { firstName, lastName, cityId, suburbId, professionalTitle, rightToWork, culturalIdentity } =
    req.body || {}

  if (typeof firstName !== 'string' || !firstName.trim()) {
    return res.status(400).json({ error: 'First name is required' })
  }
  if (typeof professionalTitle !== 'string' || !professionalTitle.trim()) {
    return res.status(400).json({ error: 'Professional title is required' })
  }
  if (typeof rightToWork !== 'boolean') {
    return res.status(400).json({ error: 'Right to work status is required' })
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

  const data = {
    firstName: firstName.trim(),
    lastName: typeof lastName === 'string' && lastName.trim() ? lastName.trim() : null,
    cityId: validatedCityId,
    suburbId: suburbResult.suburbId,
    professionalTitle: professionalTitle.trim(),
    rightToWork,
    culturalIdentity:
      typeof culturalIdentity === 'string' && culturalIdentity.trim()
        ? culturalIdentity.trim()
        : null,
  }

  const existingProfile = await prisma.profile.findUnique({ where: { userId: req.userId } })

  await prisma.profile.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId, ...data },
    update: data,
  })

  await prisma.activity.create({
    data: { type: existingProfile ? 'PROFILE_UPDATED' : 'SIGNUP', actorUserId: req.userId },
  })

  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

router.put('/about', requireProfile, async (req, res) => {
  const { about } = req.body || {}

  await prisma.profile.update({
    where: { id: req.profile.id },
    data: { about: sanitize(about) },
  })

  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

router.get('/:userId', async (req, res) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { isBlocked: true },
  })
  if (!targetUser) {
    return res.status(404).json({ error: 'Profile not found' })
  }

  if (targetUser.isBlocked && req.params.userId !== req.userId && !(await requesterIsAdmin(req.userId))) {
    return res.json({ unavailable: true })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: req.params.userId },
    include: profileInclude,
  })
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' })
  }

  const statusMap = await buildConnectionStatusMap(req.userId)

  const adjacency = await buildConnectionsAdjacency()
  const myConnections = adjacency.get(req.userId) || new Set()
  const theirConnections = adjacency.get(profile.userId) || new Set()
  const mutualConnectionIds = [...myConnections].filter((id) => theirConnections.has(id))

  const mutualConnectionUsers = mutualConnectionIds.length
    ? await prisma.user.findMany({
        where: { id: { in: mutualConnectionIds } },
        include: { profile: { include: { city: true } } },
      })
    : []

  const myProfile = await prisma.profile.findUnique({
    where: { userId: req.userId },
    include: { experiences: { select: { venueId: true } } },
  })
  const myVenueIds = new Set((myProfile?.experiences || []).map((e) => e.venueId))
  const theirVenueIds = new Set(profile.experiences.map((e) => e.venueId))
  const sharedVenuesCount = [...theirVenueIds].filter((id) => myVenueIds.has(id)).length

  res.json({
    profile: { ...profile, about: sanitize(profile.about) },
    isSelf: profile.userId === req.userId,
    ...connectionStatusFor(statusMap, profile.userId),
    mutualConnections: mutualConnectionUsers.map((u) => ({
      id: u.id,
      email: u.email,
      profile: u.profile
        ? {
            firstName: u.profile.firstName,
            lastName: u.profile.lastName,
            professionalTitle: u.profile.professionalTitle,
            city: u.profile.city,
          }
        : null,
    })),
    sharedVenuesCount,
  })
})

router.get('/:userId/activity', async (req, res) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { isBlocked: true },
  })
  if (targetUser?.isBlocked && req.params.userId !== req.userId && !(await requesterIsAdmin(req.userId))) {
    return res.json({ activities: [] })
  }

  const activities = await prisma.activity.findMany({
    where: { actorUserId: req.params.userId },
    include: {
      actorUser: { include: { profile: { include: { city: true } } } },
      venue: { select: { id: true, name: true } },
      business: { select: { id: true, name: true } },
      notice: true,
      job: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: ACTIVITY_LIMIT,
  })
  res.json({ activities: await formatActivities(activities) })
})

// --- Skills ---

router.post('/skills', requireProfile, async (req, res) => {
  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Skill name is required' })
  }
  const trimmed = name.trim()

  const skill = await prisma.skill.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: {},
  })

  await prisma.profile.update({
    where: { id: req.profile.id },
    data: { skills: { connect: { id: skill.id } } },
  })

  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

router.delete('/skills/:name', requireProfile, async (req, res) => {
  const skill = await prisma.skill.findUnique({ where: { name: req.params.name } })
  if (skill) {
    await prisma.profile.update({
      where: { id: req.profile.id },
      data: { skills: { disconnect: { id: skill.id } } },
    })
  }
  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

// --- Knowledge areas ---

router.post('/knowledge-areas', requireProfile, async (req, res) => {
  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Knowledge area name is required' })
  }
  const trimmed = name.trim()

  const knowledgeArea = await prisma.knowledgeArea.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: {},
  })

  await prisma.profile.update({
    where: { id: req.profile.id },
    data: { knowledgeAreas: { connect: { id: knowledgeArea.id } } },
  })

  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

router.delete('/knowledge-areas/:name', requireProfile, async (req, res) => {
  const knowledgeArea = await prisma.knowledgeArea.findUnique({
    where: { name: req.params.name },
  })
  if (knowledgeArea) {
    await prisma.profile.update({
      where: { id: req.profile.id },
      data: { knowledgeAreas: { disconnect: { id: knowledgeArea.id } } },
    })
  }
  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

// --- Experience ---

router.post('/experience', requireProfile, async (req, res) => {
  const { venueId, roleTitle, startDate, endDate, isCurrent } = req.body || {}

  if (typeof venueId !== 'string' || !venueId.trim()) {
    return res.status(400).json({ error: 'Venue is required' })
  }
  if (typeof roleTitle !== 'string' || !roleTitle.trim()) {
    return res.status(400).json({ error: 'Role title is required' })
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId.trim() } })
  if (!venue) {
    return res.status(400).json({ error: 'Selected venue was not found' })
  }

  const parsedStart = parseDate(startDate)
  if (!parsedStart) {
    return res.status(400).json({ error: 'A valid start date is required' })
  }

  const current = Boolean(isCurrent)
  let parsedEnd = null
  if (!current && endDate) {
    parsedEnd = parseDate(endDate)
    if (!parsedEnd) {
      return res.status(400).json({ error: 'Invalid end date' })
    }
  }

  const experience = await prisma.experience.create({
    data: {
      profileId: req.profile.id,
      venueId: venue.id,
      roleTitle: roleTitle.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      isCurrent: current,
    },
    include: { venue: { include: { city: true } } },
  })

  await prisma.activity.create({ data: { type: 'EXPERIENCE_ADDED', actorUserId: req.userId } })

  res.status(201).json({ experience })
})

router.put('/experience/:id', requireProfile, async (req, res) => {
  const existing = await prisma.experience.findFirst({
    where: { id: req.params.id, profileId: req.profile.id },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Experience entry not found' })
  }

  const { venueId, roleTitle, startDate, endDate, isCurrent } = req.body || {}

  if (typeof venueId !== 'string' || !venueId.trim()) {
    return res.status(400).json({ error: 'Venue is required' })
  }
  if (typeof roleTitle !== 'string' || !roleTitle.trim()) {
    return res.status(400).json({ error: 'Role title is required' })
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId.trim() } })
  if (!venue) {
    return res.status(400).json({ error: 'Selected venue was not found' })
  }

  const parsedStart = parseDate(startDate)
  if (!parsedStart) {
    return res.status(400).json({ error: 'A valid start date is required' })
  }

  const current = Boolean(isCurrent)
  let parsedEnd = null
  if (!current && endDate) {
    parsedEnd = parseDate(endDate)
    if (!parsedEnd) {
      return res.status(400).json({ error: 'Invalid end date' })
    }
  }

  const experience = await prisma.experience.update({
    where: { id: existing.id },
    data: {
      venueId: venue.id,
      roleTitle: roleTitle.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      isCurrent: current,
    },
    include: { venue: { include: { city: true } } },
  })

  res.json({ experience })
})

router.delete('/experience/:id', requireProfile, async (req, res) => {
  const existing = await prisma.experience.findFirst({
    where: { id: req.params.id, profileId: req.profile.id },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Experience entry not found' })
  }
  await prisma.experience.delete({ where: { id: existing.id } })
  res.status(204).end()
})

// --- Certifications ---

router.post('/certifications', requireProfile, async (req, res) => {
  const { certificationTypeId, issueDate, expiryDate } = req.body || {}

  if (typeof certificationTypeId !== 'string' || !certificationTypeId.trim()) {
    return res.status(400).json({ error: 'Certification type is required' })
  }

  const certificationType = await prisma.certificationType.findUnique({
    where: { id: certificationTypeId.trim() },
  })
  if (!certificationType) {
    return res.status(400).json({ error: 'Selected certification type was not found' })
  }

  const parsedIssue = parseDate(issueDate)
  if (!parsedIssue) {
    return res.status(400).json({ error: 'A valid issue date is required' })
  }

  let parsedExpiry = null
  if (expiryDate) {
    parsedExpiry = parseDate(expiryDate)
    if (!parsedExpiry) {
      return res.status(400).json({ error: 'Invalid expiry date' })
    }
  }

  const certification = await prisma.certification.create({
    data: {
      profileId: req.profile.id,
      certificationTypeId: certificationType.id,
      issueDate: parsedIssue,
      expiryDate: parsedExpiry,
    },
    include: { certificationType: true },
  })

  await prisma.activity.create({ data: { type: 'CERTIFICATION_ADDED', actorUserId: req.userId } })

  res.status(201).json({ certification })
})

router.put('/certifications/:id', requireProfile, async (req, res) => {
  const existing = await prisma.certification.findFirst({
    where: { id: req.params.id, profileId: req.profile.id },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Certification not found' })
  }

  const { certificationTypeId, issueDate, expiryDate } = req.body || {}

  if (typeof certificationTypeId !== 'string' || !certificationTypeId.trim()) {
    return res.status(400).json({ error: 'Certification type is required' })
  }

  const certificationType = await prisma.certificationType.findUnique({
    where: { id: certificationTypeId.trim() },
  })
  if (!certificationType) {
    return res.status(400).json({ error: 'Selected certification type was not found' })
  }

  const parsedIssue = parseDate(issueDate)
  if (!parsedIssue) {
    return res.status(400).json({ error: 'A valid issue date is required' })
  }

  let parsedExpiry = null
  if (expiryDate) {
    parsedExpiry = parseDate(expiryDate)
    if (!parsedExpiry) {
      return res.status(400).json({ error: 'Invalid expiry date' })
    }
  }

  const certification = await prisma.certification.update({
    where: { id: existing.id },
    data: {
      certificationTypeId: certificationType.id,
      issueDate: parsedIssue,
      expiryDate: parsedExpiry,
    },
    include: { certificationType: true },
  })

  res.json({ certification })
})

router.delete('/certifications/:id', requireProfile, async (req, res) => {
  const existing = await prisma.certification.findFirst({
    where: { id: req.params.id, profileId: req.profile.id },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Certification not found' })
  }
  await prisma.certification.delete({ where: { id: existing.id } })
  res.status(204).end()
})

module.exports = router
