const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { getCommonGroundPeople, compareShared } = require('./discover')
const { formatActor, formatActivities } = require('../lib/activityFeed')

const router = express.Router()
router.use(requireAuth)

const SUGGESTION_LIMIT = 5
const ACTIVITY_LIMIT = 50
const SIGNUP_LIMIT = 20

const zeroShared = { skills: 0, knowledgeAreas: 0, venues: 0, connections: 0, total: 0 }

router.get('/feed', async (req, res) => {
  const connectionRequests = await prisma.connectionRequest.findMany({
    where: { status: 'ACCEPTED', OR: [{ fromUserId: req.userId }, { toUserId: req.userId }] },
  })
  const connectionUserIds = connectionRequests.map((r) =>
    r.fromUserId === req.userId ? r.toUserId : r.fromUserId,
  )

  const [venueFollows, businessFollows, managedVenues, managedBusinesses, workedVenues] = await Promise.all([
    prisma.venueFollow.findMany({ where: { userId: req.userId } }),
    prisma.businessFollow.findMany({ where: { userId: req.userId } }),
    prisma.venueManager.findMany({ where: { userId: req.userId }, select: { venueId: true } }),
    prisma.businessManager.findMany({ where: { userId: req.userId }, select: { businessId: true } }),
    prisma.experience.findMany({
      where: { profile: { userId: req.userId } },
      select: { venueId: true },
      distinct: ['venueId'],
    }),
  ])

  const followedVenueIds = venueFollows.map((f) => f.venueId)
  const favouritedVenueIds = new Set(venueFollows.filter((f) => f.isFavourite).map((f) => f.venueId))
  const followedBusinessIds = businessFollows.map((f) => f.businessId)
  const favouritedBusinessIds = new Set(
    businessFollows.filter((f) => f.isFavourite).map((f) => f.businessId),
  )

  // Notice/Job reach: assigned managers of a venue/business, plus (venues only)
  // anyone with a current/previous Experience there, see NOTICE_POSTED and
  // JOB_POSTED activity even if they don't follow the venue/business.
  const noticeReachVenueIds = [
    ...new Set([...managedVenues.map((m) => m.venueId), ...workedVenues.map((w) => w.venueId)]),
  ]
  const noticeReachBusinessIds = managedBusinesses.map((m) => m.businessId)
  const venueReachTypes = ['NOTICE_POSTED', 'JOB_POSTED']

  const orConditions = [
    connectionUserIds.length > 0 ? { actorUserId: { in: connectionUserIds } } : null,
    followedVenueIds.length > 0 ? { venueId: { in: followedVenueIds } } : null,
    followedBusinessIds.length > 0 ? { businessId: { in: followedBusinessIds } } : null,
    noticeReachVenueIds.length > 0
      ? { type: { in: venueReachTypes }, venueId: { in: noticeReachVenueIds } }
      : null,
    noticeReachBusinessIds.length > 0
      ? { type: 'NOTICE_POSTED', businessId: { in: noticeReachBusinessIds } }
      : null,
  ].filter(Boolean)

  const activities = orConditions.length
    ? await prisma.activity.findMany({
        where: {
          type: { not: 'SIGNUP' },
          AND: [{ OR: orConditions }, { OR: [{ actorUserId: null }, { actorUser: { isBlocked: false } }] }],
        },
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
    : []

  const feed = await formatActivities(activities, {
    isFavourited: (a) =>
      (a.venueId && favouritedVenueIds.has(a.venueId)) ||
      (a.businessId && favouritedBusinessIds.has(a.businessId)),
  })

  const favouritedFeed = feed.filter((a) => a.favourited)
  const restFeed = feed.filter((a) => !a.favourited)

  const commonGroundPeople = await getCommonGroundPeople(req.userId)
  const sharedByUserId = new Map(commonGroundPeople.map((p) => [p.id, p.shared]))

  const signupActivitiesRaw = await prisma.activity.findMany({
    where: { type: 'SIGNUP', actorUserId: { not: req.userId }, actorUser: { isBlocked: false } },
    include: { actorUser: { include: { profile: { include: { city: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: SIGNUP_LIMIT,
  })

  const signupFeed = signupActivitiesRaw
    .map((a) => ({
      id: a.id,
      type: a.type,
      createdAt: a.createdAt,
      favourited: false,
      actor: formatActor(a.actorUser),
      counterpart: null,
      venue: null,
      business: null,
      shared: sharedByUserId.get(a.actorUserId) || zeroShared,
    }))
    .sort((a, b) => compareShared(a, b) || new Date(b.createdAt) - new Date(a.createdAt))
    .map(({ shared, ...rest }) => rest)

  const suggestions = commonGroundPeople.slice(0, SUGGESTION_LIMIT)

  res.json({ activities: [...favouritedFeed, ...signupFeed, ...restFeed], suggestions })
})

module.exports = router
