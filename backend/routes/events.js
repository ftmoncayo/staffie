const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { canEditEventOwner, getEventOwnerManagers, ownerExists } = require('../lib/events')
const { createNotification } = require('../lib/notifications')
const { resolveScopeForRequest, resolveScopeAncestors, venueLocationWhere } = require('../lib/location')

const router = express.Router()
router.use(requireAuth)

const eventInclude = {
  category: true,
  locationVenue: {
    select: {
      id: true,
      name: true,
      city: { include: { state: { include: { country: true } } } },
    },
  },
  skills: { include: { skill: true } },
  knowledgeAreas: { include: { knowledgeArea: true } },
}

function parseIds(ids) {
  if (!Array.isArray(ids)) return []
  return ids.filter((id) => typeof id === 'string' && id.trim())
}

async function validateSkillIds(ids) {
  if (ids.length === 0) return []
  const found = await prisma.skill.findMany({ where: { id: { in: ids } } })
  return found.map((s) => s.id)
}

async function validateKnowledgeAreaIds(ids) {
  if (ids.length === 0) return []
  const found = await prisma.knowledgeArea.findMany({ where: { id: { in: ids } } })
  return found.map((k) => k.id)
}

// null/undefined/empty clears the location; otherwise the venue must exist.
async function validateLocationVenueId(locationVenueId) {
  if (typeof locationVenueId !== 'string' || !locationVenueId.trim()) {
    return { ok: true, locationVenueId: null }
  }
  const venue = await prisma.venue.findUnique({ where: { id: locationVenueId.trim() } })
  if (!venue) return { ok: false, error: 'Selected venue was not found' }
  return { ok: true, locationVenueId: venue.id }
}

async function attachOwnerNames(events) {
  const venueIds = [...new Set(events.filter((e) => e.ownerType === 'VENUE').map((e) => e.ownerId))]
  const businessIds = [...new Set(events.filter((e) => e.ownerType === 'BUSINESS').map((e) => e.ownerId))]

  const [venues, businesses] = await Promise.all([
    venueIds.length ? prisma.venue.findMany({ where: { id: { in: venueIds } }, select: { id: true, name: true } }) : [],
    businessIds.length
      ? prisma.business.findMany({ where: { id: { in: businessIds } }, select: { id: true, name: true } })
      : [],
  ])
  const nameById = new Map([...venues, ...businesses].map((o) => [o.id, o.name]))

  return events.map((e) => ({ ...e, owner: { id: e.ownerId, name: nameById.get(e.ownerId) || 'Unknown' } }))
}

function shapeEvent(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    ownerType: event.ownerType,
    ownerId: event.ownerId,
    startAt: event.startAt,
    endAt: event.endAt,
    locationVenue: event.locationVenue,
    createdByUserId: event.createdByUserId,
    createdAt: event.createdAt,
    skills: event.skills.map((es) => es.skill),
    knowledgeAreas: event.knowledgeAreas.map((ek) => ek.knowledgeArea),
  }
}

async function getManagedVenueIds(userId) {
  const rows = await prisma.venueManager.findMany({ where: { userId }, select: { venueId: true } })
  return rows.map((r) => r.venueId)
}

async function getManagedBusinessIds(userId) {
  const rows = await prisma.businessManager.findMany({ where: { userId }, select: { businessId: true } })
  return rows.map((r) => r.businessId)
}

router.get('/events', async (req, res) => {
  const categoryId =
    typeof req.query.categoryId === 'string' && req.query.categoryId.trim() ? req.query.categoryId.trim() : null
  const ownerType = req.query.ownerType === 'VENUE' || req.query.ownerType === 'BUSINESS' ? req.query.ownerType : null
  const ownerId = typeof req.query.ownerId === 'string' && req.query.ownerId.trim() ? req.query.ownerId.trim() : null
  const when = req.query.when === 'past' ? 'past' : 'upcoming'
  const mine = req.query.mine === 'true'
  // A specific owner's timeline (e.g. PastEvents) isn't location-filterable
  // - it's already scoped by owner identity - so an omitted scope means "no
  // filter" there rather than defaulting. "My Events" is exempt from this:
  // like My Venues/My Businesses, it's deliberately still location-scopable.
  const scope = await resolveScopeForRequest(req, '', !(ownerType && ownerId))
  const scopeAncestors = await resolveScopeAncestors(scope)

  const now = new Date()
  const and = [
    when === 'past'
      ? { startAt: { lt: now } }
      : { OR: [{ endAt: { gte: now } }, { endAt: null, startAt: { gte: now } }] },
  ]
  const venueScopeWhere = venueLocationWhere(scopeAncestors)
  if (Object.keys(venueScopeWhere).length) and.push({ locationVenue: venueScopeWhere })
  if (categoryId) and.push({ categoryId })

  if (mine) {
    const [managedVenueIds, managedBusinessIds] = await Promise.all([
      getManagedVenueIds(req.userId),
      getManagedBusinessIds(req.userId),
    ])
    if (managedVenueIds.length === 0 && managedBusinessIds.length === 0) {
      return res.json({ events: [] })
    }
    and.push({
      OR: [
        managedVenueIds.length ? { ownerType: 'VENUE', ownerId: { in: managedVenueIds } } : null,
        managedBusinessIds.length ? { ownerType: 'BUSINESS', ownerId: { in: managedBusinessIds } } : null,
      ].filter(Boolean),
    })
  } else if (ownerType && ownerId) {
    and.push({ ownerType, ownerId })
  }

  const events = await prisma.event.findMany({
    where: { AND: and },
    include: eventInclude,
    orderBy: { startAt: when === 'past' ? 'desc' : 'asc' },
  })

  const shaped = await attachOwnerNames(events.map(shapeEvent))
  res.json({ events: shaped })
})

router.get('/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: eventInclude })
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const [shapedWithOwner] = await attachOwnerNames([shapeEvent(event)])
  const canEdit = await canEditEventOwner(req.userId, event.ownerType, event.ownerId)
  const myInterest = await prisma.eventInterest.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: req.userId } },
  })

  res.json({
    event: {
      ...shapedWithOwner,
      canEdit,
      myInterest: myInterest ? { status: myInterest.status, note: myInterest.note } : null,
    },
  })
})

router.post('/events', async (req, res) => {
  const {
    title,
    description,
    categoryId,
    ownerType,
    ownerId,
    startAt,
    endAt,
    locationVenueId,
    skillIds,
    knowledgeAreaIds,
  } = req.body || {}

  if (ownerType !== 'VENUE' && ownerType !== 'BUSINESS') {
    return res.status(400).json({ error: 'ownerType must be VENUE or BUSINESS' })
  }
  if (typeof ownerId !== 'string' || !ownerId.trim()) {
    return res.status(400).json({ error: 'ownerId is required' })
  }
  if (!(await ownerExists(ownerType, ownerId.trim()))) {
    return res.status(400).json({ error: 'Selected venue/business was not found' })
  }

  const allowed = await canEditEventOwner(req.userId, ownerType, ownerId.trim())
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to create an event for this venue/business' })
  }

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Event title is required' })
  }
  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Event description is required' })
  }
  if (typeof categoryId !== 'string' || !categoryId.trim()) {
    return res.status(400).json({ error: 'Event category is required' })
  }
  const category = await prisma.eventCategory.findUnique({ where: { id: categoryId.trim() } })
  if (!category) {
    return res.status(400).json({ error: 'Selected category was not found' })
  }

  const parsedStart = startAt ? new Date(startAt) : null
  if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
    return res.status(400).json({ error: 'A valid start date/time is required' })
  }
  let parsedEnd = null
  if (endAt) {
    parsedEnd = new Date(endAt)
    if (Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid end date/time' })
    }
    if (parsedEnd < parsedStart) {
      return res.status(400).json({ error: 'End time cannot be before start time' })
    }
  }

  const location = await validateLocationVenueId(locationVenueId)
  if (!location.ok) {
    return res.status(400).json({ error: location.error })
  }
  // A VENUE-owned event with no explicit location defaults to the venue
  // itself; BUSINESS-owned events (no single fixed location) stay unset
  // unless the creator picked one. Applied server-side too as a safety net
  // beyond the form's own default pre-fill.
  const resolvedLocationVenueId =
    location.locationVenueId || (ownerType === 'VENUE' ? ownerId.trim() : null)

  const validSkillIds = await validateSkillIds(parseIds(skillIds))
  const validKnowledgeAreaIds = await validateKnowledgeAreaIds(parseIds(knowledgeAreaIds))

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      categoryId: category.id,
      ownerType,
      ownerId: ownerId.trim(),
      startAt: parsedStart,
      endAt: parsedEnd,
      locationVenueId: resolvedLocationVenueId,
      createdByUserId: req.userId,
      skills: { create: validSkillIds.map((skillId) => ({ skillId })) },
      knowledgeAreas: { create: validKnowledgeAreaIds.map((knowledgeAreaId) => ({ knowledgeAreaId })) },
    },
    include: eventInclude,
  })

  const [shaped] = await attachOwnerNames([shapeEvent(event)])
  res.status(201).json({ event: { ...shaped, canEdit: true, myInterest: null } })
})

router.put('/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } })
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const allowed = await canEditEventOwner(req.userId, event.ownerType, event.ownerId)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to edit this event' })
  }

  const {
    title,
    description,
    categoryId,
    startAt,
    endAt,
    locationVenueId,
    skillIds,
    knowledgeAreaIds,
  } = req.body || {}
  const data = {}

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required' })
    }
    data.title = title.trim()
  }
  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Event description is required' })
    }
    data.description = description.trim()
  }
  if (categoryId !== undefined) {
    const category = await prisma.eventCategory.findUnique({ where: { id: categoryId } })
    if (!category) {
      return res.status(400).json({ error: 'Selected category was not found' })
    }
    data.categoryId = category.id
  }
  if (startAt !== undefined) {
    const parsedStart = new Date(startAt)
    if (Number.isNaN(parsedStart.getTime())) {
      return res.status(400).json({ error: 'A valid start date/time is required' })
    }
    data.startAt = parsedStart
  }
  if (endAt !== undefined) {
    if (endAt === null || endAt === '') {
      data.endAt = null
    } else {
      const parsedEnd = new Date(endAt)
      if (Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid end date/time' })
      }
      data.endAt = parsedEnd
    }
  }
  if (locationVenueId !== undefined) {
    const location = await validateLocationVenueId(locationVenueId)
    if (!location.ok) {
      return res.status(400).json({ error: location.error })
    }
    data.locationVenueId = location.locationVenueId
  }
  if (skillIds !== undefined) {
    const validSkillIds = await validateSkillIds(parseIds(skillIds))
    data.skills = { deleteMany: {}, create: validSkillIds.map((skillId) => ({ skillId })) }
  }
  if (knowledgeAreaIds !== undefined) {
    const validKnowledgeAreaIds = await validateKnowledgeAreaIds(parseIds(knowledgeAreaIds))
    data.knowledgeAreas = {
      deleteMany: {},
      create: validKnowledgeAreaIds.map((knowledgeAreaId) => ({ knowledgeAreaId })),
    }
  }

  const updated = await prisma.event.update({ where: { id: event.id }, data, include: eventInclude })
  const [shaped] = await attachOwnerNames([shapeEvent(updated)])
  const myInterest = await prisma.eventInterest.findUnique({
    where: { eventId_userId: { eventId: updated.id, userId: req.userId } },
  })
  res.json({
    event: { ...shaped, canEdit: true, myInterest: myInterest ? { status: myInterest.status, note: myInterest.note } : null },
  })
})

router.post('/events/:id/interest', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } })
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const { note } = req.body || {}
  const trimmedNote = typeof note === 'string' && note.trim() ? note.trim() : null

  const existing = await prisma.eventInterest.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: req.userId } },
  })

  let interest
  if (existing) {
    interest =
      existing.status === 'INTERESTED'
        ? await prisma.eventInterest.update({ where: { id: existing.id }, data: { note: trimmedNote } })
        : existing
  } else {
    interest = await prisma.eventInterest.create({
      data: { eventId: event.id, userId: req.userId, note: trimmedNote },
    })

    const managers = await getEventOwnerManagers(event.ownerType, event.ownerId)
    for (const manager of managers) {
      await createNotification({
        userId: manager.id,
        type: 'EVENT_INTEREST',
        sourceUserId: req.userId,
        targetType: 'EVENT',
        targetId: event.id,
      })
    }
  }

  res.status(201).json({ interest: { status: interest.status, note: interest.note } })
})

// If attended, upgrades the worker's Skill/KnowledgeArea items developed by
// this event: connects any not yet on their profile and marks them
// Upskilling; for items already on the profile at the self-declared default
// (no peer/manager Endorsement yet), marks them Upskilling too; items
// already peer- or manager-endorsed are left untouched entirely. If not
// attended, the EventInterest is marked DID_NOT_ATTEND and excluded from
// training history everywhere else in the app.
router.put('/events/:id/confirm-attendance', async (req, res) => {
  const { attended } = req.body || {}
  if (typeof attended !== 'boolean') {
    return res.status(400).json({ error: 'attended (boolean) is required' })
  }

  const interest = await prisma.eventInterest.findUnique({
    where: { eventId_userId: { eventId: req.params.id, userId: req.userId } },
  })
  if (!interest) {
    return res.status(404).json({ error: 'You did not express interest in this event' })
  }

  await prisma.notification.updateMany({
    where: {
      userId: req.userId,
      type: 'ATTENDANCE_CONFIRM',
      targetType: 'EVENT',
      targetId: req.params.id,
      dismissed: false,
    },
    data: { dismissed: true },
  })

  if (!attended) {
    const updated = await prisma.eventInterest.update({
      where: { id: interest.id },
      data: { status: 'DID_NOT_ATTEND' },
    })
    return res.json({ interest: { status: updated.status, note: updated.note } })
  }

  const updated = await prisma.eventInterest.update({ where: { id: interest.id }, data: { status: 'ATTENDED' } })

  const profile = await prisma.profile.findUnique({ where: { userId: req.userId } })
  if (profile) {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { skills: true, knowledgeAreas: true },
    })

    const items = [
      ...event.skills.map((es) => ({ itemType: 'SKILL', itemId: es.skillId })),
      ...event.knowledgeAreas.map((ek) => ({ itemType: 'KNOWLEDGE_AREA', itemId: ek.knowledgeAreaId })),
    ]

    if (items.length > 0) {
      const [ownedProfile, endorsements] = await Promise.all([
        prisma.profile.findUnique({ where: { id: profile.id }, include: { skills: true, knowledgeAreas: true } }),
        prisma.endorsement.findMany({
          where: {
            profileId: profile.id,
            OR: items.map((i) => ({ itemType: i.itemType, itemId: i.itemId })),
          },
        }),
      ])
      const ownedSkillIds = new Set((ownedProfile?.skills || []).map((s) => s.id))
      const ownedKnowledgeAreaIds = new Set((ownedProfile?.knowledgeAreas || []).map((k) => k.id))
      const endorsedKeys = new Set(endorsements.map((e) => `${e.itemType}:${e.itemId}`))

      for (const item of items) {
        const isOwned =
          item.itemType === 'SKILL' ? ownedSkillIds.has(item.itemId) : ownedKnowledgeAreaIds.has(item.itemId)

        if (!isOwned) {
          await prisma.profile.update({
            where: { id: profile.id },
            data:
              item.itemType === 'SKILL'
                ? { skills: { connect: { id: item.itemId } } }
                : { knowledgeAreas: { connect: { id: item.itemId } } },
          })
        }

        if (!endorsedKeys.has(`${item.itemType}:${item.itemId}`)) {
          await prisma.upskilling.upsert({
            where: {
              profileId_itemType_itemId: { profileId: profile.id, itemType: item.itemType, itemId: item.itemId },
            },
            create: { profileId: profile.id, itemType: item.itemType, itemId: item.itemId },
            update: {},
          })
        }
      }
    }
  }

  res.json({ interest: { status: updated.status, note: updated.note } })
})

module.exports = router
