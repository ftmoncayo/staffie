const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { getCommonGroundPeople } = require('./discover')

const router = express.Router()
router.use(requireAuth)

const SUGGESTION_LIMIT = 5
const ACTIVITY_LIMIT = 50

function formatActor(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          professionalTitle: user.profile.professionalTitle,
          city: user.profile.city,
        }
      : null,
  }
}

router.get('/feed', async (req, res) => {
  const connectionRequests = await prisma.connectionRequest.findMany({
    where: { status: 'ACCEPTED', OR: [{ fromUserId: req.userId }, { toUserId: req.userId }] },
  })
  const connectionUserIds = connectionRequests.map((r) =>
    r.fromUserId === req.userId ? r.toUserId : r.fromUserId,
  )

  const [venueFollows, businessFollows] = await Promise.all([
    prisma.venueFollow.findMany({ where: { userId: req.userId } }),
    prisma.businessFollow.findMany({ where: { userId: req.userId } }),
  ])

  const followedVenueIds = venueFollows.map((f) => f.venueId)
  const favouritedVenueIds = new Set(venueFollows.filter((f) => f.isFavourite).map((f) => f.venueId))
  const followedBusinessIds = businessFollows.map((f) => f.businessId)
  const favouritedBusinessIds = new Set(
    businessFollows.filter((f) => f.isFavourite).map((f) => f.businessId),
  )

  const orConditions = [
    connectionUserIds.length > 0 ? { actorUserId: { in: connectionUserIds } } : null,
    followedVenueIds.length > 0 ? { venueId: { in: followedVenueIds } } : null,
    followedBusinessIds.length > 0 ? { businessId: { in: followedBusinessIds } } : null,
  ].filter(Boolean)

  const activities = orConditions.length
    ? await prisma.activity.findMany({
        where: { OR: orConditions },
        include: {
          actorUser: { include: { profile: { include: { city: true } } } },
          venue: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY_LIMIT,
      })
    : []

  // Resolve the "other party" for CONNECTION_MADE activities by matching on the
  // exact respondedAt timestamp shared with the Activity.createdAt at creation time.
  const connectionActivities = activities.filter((a) => a.type === 'CONNECTION_MADE')
  const connectionTimestamps = [...new Set(connectionActivities.map((a) => a.createdAt.getTime()))]
  const matchingRequests = connectionTimestamps.length
    ? await prisma.connectionRequest.findMany({
        where: { status: 'ACCEPTED', respondedAt: { in: connectionActivities.map((a) => a.createdAt) } },
      })
    : []

  const counterpartByActorAndTime = new Map()
  for (const r of matchingRequests) {
    const time = r.respondedAt.getTime()
    counterpartByActorAndTime.set(`${r.fromUserId}_${time}`, r.toUserId)
    counterpartByActorAndTime.set(`${r.toUserId}_${time}`, r.fromUserId)
  }

  const counterpartIds = [
    ...new Set(
      connectionActivities
        .map((a) => counterpartByActorAndTime.get(`${a.actorUserId}_${a.createdAt.getTime()}`))
        .filter(Boolean),
    ),
  ]
  const counterpartUsers = counterpartIds.length
    ? await prisma.user.findMany({
        where: { id: { in: counterpartIds } },
        include: { profile: { include: { city: true } } },
      })
    : []
  const counterpartById = new Map(counterpartUsers.map((u) => [u.id, u]))

  const feed = activities.map((a) => {
    const favourited =
      (a.venueId && favouritedVenueIds.has(a.venueId)) ||
      (a.businessId && favouritedBusinessIds.has(a.businessId))

    const counterpartId = counterpartByActorAndTime.get(`${a.actorUserId}_${a.createdAt.getTime()}`)

    return {
      id: a.id,
      type: a.type,
      createdAt: a.createdAt,
      favourited: Boolean(favourited),
      actor: formatActor(a.actorUser),
      counterpart: counterpartId ? formatActor(counterpartById.get(counterpartId)) : null,
      venue: a.venue,
      business: a.business,
    }
  })

  const favouritedFeed = feed.filter((a) => a.favourited)
  const restFeed = feed.filter((a) => !a.favourited)

  const suggestions = (await getCommonGroundPeople(req.userId)).slice(0, SUGGESTION_LIMIT)

  res.json({ activities: [...favouritedFeed, ...restFeed], suggestions })
})

module.exports = router
