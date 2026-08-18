const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { sanitize } = require('../lib/sanitizeHtml')
const {
  buildConnectionStatusMap,
  connectionStatusFor,
  buildConnectionsAdjacency,
} = require('../lib/connectionStatus')
const { formatActivities, formatActor } = require('../lib/activityFeed')
const {
  PEER_NOTIFY_LIMIT,
  attachEndorsementLevels,
  getWorkerVenueIds,
  getEligiblePeerUserIds,
  getEligibleManagerUserIds,
  isEligibleManagerFor,
  clearPendingEndorsementRequests,
} = require('../lib/endorsements')

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
  if (!profile) return profile
  const withLevels = await attachEndorsementLevels(profile)
  return { ...withLevels, about: sanitize(profile.about) }
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

  const rawProfile = await prisma.profile.findUnique({
    where: { userId: req.params.userId },
    include: profileInclude,
  })
  if (!rawProfile) {
    return res.status(404).json({ error: 'Profile not found' })
  }
  const profile = await attachEndorsementLevels(rawProfile)

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
      experience: { select: { roleTitle: true } },
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
    // Endorsements are keyed by itemId, not the m2m row, so they'd otherwise
    // survive a remove — and silently resurface if the same skill is re-added.
    await prisma.endorsement.deleteMany({
      where: { profileId: req.profile.id, itemType: 'SKILL', itemId: skill.id },
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
    await prisma.endorsement.deleteMany({
      where: { profileId: req.profile.id, itemType: 'KNOWLEDGE_AREA', itemId: knowledgeArea.id },
    })
  }
  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

// --- Endorsements ---

async function createEndorsementRequestIfNeeded({ recipientUserId, workerUserId, itemType, itemId }) {
  if (recipientUserId === workerUserId) return
  const existing = await prisma.notification.findFirst({
    where: {
      userId: recipientUserId,
      sourceUserId: workerUserId,
      type: 'ENDORSEMENT_REQUEST',
      targetType: itemType,
      targetId: itemId,
      dismissed: false,
    },
  })
  if (existing) return
  await prisma.notification.create({
    data: {
      userId: recipientUserId,
      sourceUserId: workerUserId,
      type: 'ENDORSEMENT_REQUEST',
      targetType: itemType,
      targetId: itemId,
    },
  })
}

router.post('/request-endorsements', requireProfile, async (req, res) => {
  const { items, recipientScope } = req.body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Select at least one item to request endorsements for' })
  }
  if (!['PEERS', 'MANAGERS', 'BOTH'].includes(recipientScope)) {
    return res.status(400).json({ error: 'Invalid recipient scope' })
  }

  const ownProfile = await prisma.profile.findUnique({
    where: { id: req.profile.id },
    include: { skills: true, knowledgeAreas: true },
  })
  const validSkillIds = new Set(ownProfile.skills.map((s) => s.id))
  const validKnowledgeAreaIds = new Set(ownProfile.knowledgeAreas.map((k) => k.id))

  const validItems = items.filter((item) => {
    if (typeof item?.itemId !== 'string' || !item.itemId.trim()) return false
    if (item.itemType === 'SKILL') return validSkillIds.has(item.itemId)
    if (item.itemType === 'KNOWLEDGE_AREA') return validKnowledgeAreaIds.has(item.itemId)
    return false
  })
  if (validItems.length === 0) {
    return res.status(400).json({ error: 'None of the selected items were found on your profile' })
  }

  let recipientUserIds = []
  if (recipientScope === 'PEERS' || recipientScope === 'BOTH') {
    const peers = await getEligiblePeerUserIds(req.profile.id, req.userId)
    recipientUserIds.push(...peers.slice(0, PEER_NOTIFY_LIMIT))
  }
  if (recipientScope === 'MANAGERS' || recipientScope === 'BOTH') {
    const venueIds = await getWorkerVenueIds(req.profile.id)
    const managers = await getEligibleManagerUserIds(venueIds, req.userId)
    recipientUserIds.push(...managers)
  }
  recipientUserIds = [...new Set(recipientUserIds)]

  if (recipientUserIds.length === 0) {
    return res.status(400).json({ error: 'No eligible people found to request endorsements from' })
  }

  for (const recipientUserId of recipientUserIds) {
    for (const item of validItems) {
      await createEndorsementRequestIfNeeded({
        recipientUserId,
        workerUserId: req.userId,
        itemType: item.itemType,
        itemId: item.itemId,
      })
    }
  }

  const recipientUsers = await prisma.user.findMany({
    where: { id: { in: recipientUserIds } },
    include: { profile: { include: { city: true } } },
  })
  const recipientById = new Map(recipientUsers.map((u) => [u.id, u]))
  const recipients = recipientUserIds.map((id) => formatActor(recipientById.get(id)))

  res.status(201).json({
    ok: true,
    recipientCount: recipientUserIds.length,
    itemCount: validItems.length,
    recipients,
  })
})

// A verified manager of a venue where :userId has current/previous Experience
// can add a Skill/Knowledge item on that person's behalf, immediately at
// Level 3 (a MANAGER endorsement from creation).
async function requireManagerEligibleForWorker(req, res, next) {
  const targetProfile = await prisma.profile.findUnique({ where: { userId: req.params.userId } })
  if (!targetProfile) {
    return res.status(404).json({ error: 'Profile not found' })
  }
  const eligible = await isEligibleManagerFor(req.userId, targetProfile.id)
  if (!eligible) {
    return res
      .status(403)
      .json({ error: 'You must be a verified manager of a venue this person has worked at' })
  }
  req.targetProfile = targetProfile
  next()
}

async function endorseAsManager({ targetProfileId, itemType, itemId, managerUserId, workerUserId }) {
  await prisma.endorsement.upsert({
    where: {
      profileId_itemType_itemId_endorserUserId: {
        profileId: targetProfileId,
        itemType,
        itemId,
        endorserUserId: managerUserId,
      },
    },
    create: { profileId: targetProfileId, itemType, itemId, endorserUserId: managerUserId, endorserRole: 'MANAGER' },
    update: { endorserRole: 'MANAGER' },
  })
  await clearPendingEndorsementRequests({ workerUserId, itemType, itemId })
}

router.post('/:userId/skills', requireManagerEligibleForWorker, async (req, res) => {
  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Skill name is required' })
  }
  const trimmed = name.trim()

  const skill = await prisma.skill.upsert({ where: { name: trimmed }, create: { name: trimmed }, update: {} })

  await prisma.profile.update({
    where: { id: req.targetProfile.id },
    data: { skills: { connect: { id: skill.id } } },
  })

  await endorseAsManager({
    targetProfileId: req.targetProfile.id,
    itemType: 'SKILL',
    itemId: skill.id,
    managerUserId: req.userId,
    workerUserId: req.params.userId,
  })

  res.status(201).json({ skill: { ...skill, level: 3 } })
})

router.post('/:userId/knowledge-areas', requireManagerEligibleForWorker, async (req, res) => {
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
    where: { id: req.targetProfile.id },
    data: { knowledgeAreas: { connect: { id: knowledgeArea.id } } },
  })

  await endorseAsManager({
    targetProfileId: req.targetProfile.id,
    itemType: 'KNOWLEDGE_AREA',
    itemId: knowledgeArea.id,
    managerUserId: req.userId,
    workerUserId: req.params.userId,
  })

  res.status(201).json({ knowledgeArea: { ...knowledgeArea, level: 3 } })
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

  await prisma.activity.create({
    data: { type: 'EXPERIENCE_ADDED', actorUserId: req.userId, venueId: venue.id, experienceId: experience.id },
  })

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
