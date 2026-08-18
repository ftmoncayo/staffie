const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { getCommonGroundPeople } = require('./discover')
const { formatActivities } = require('../lib/activityFeed')
const { parseScopeParam, resolveScopeAncestors, profileLocationWhere } = require('../lib/location')

const router = express.Router()
router.use(requireAuth)

const SUGGESTION_LIMIT = 5
const ACTIVITY_LIMIT = 50
const SIGNUP_LIMIT = 20

router.get('/feed', async (req, res) => {
  const scope = parseScopeParam(req.query.scopeType, req.query.scopeId)
  const scopeAncestors = await resolveScopeAncestors(scope)
  const suggestionScope = parseScopeParam(req.query.suggestionScopeType, req.query.suggestionScopeId)
  const suggestionScopeAncestors = await resolveScopeAncestors(suggestionScope)

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

  // Mirrors the existing Posts city filter, generalized to any of the four
  // location levels: an activity is attributed to its actor the same way a
  // Post is attributed to its author, so filtering by the actor's own
  // profile location is the natural analogue. Actor-less activities (and
  // ones whose actor has no location) are excluded once a filter is active,
  // since their placement can't be confirmed.
  const profileScopeWhere = scopeAncestors ? profileLocationWhere(scopeAncestors) : null

  const activities = orConditions.length
    ? await prisma.activity.findMany({
        where: {
          type: { notIn: ['SIGNUP', 'PROFILE_UPDATED'] },
          AND: [
            { OR: orConditions },
            { OR: [{ actorUserId: null }, { actorUser: { isBlocked: false } }] },
            ...(profileScopeWhere ? [{ actorUser: { profile: profileScopeWhere } }] : []),
          ],
        },
        include: {
          actorUser: { include: { profile: { include: { city: true } } } },
          venue: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
          notice: true,
          job: { select: { id: true, title: true } },
          experience: { select: { roleTitle: true } },
        },
        // Ordering/limiting by lastEngagementAt (not createdAt) so a notice
        // bumped by a fresh comment can resurface even if its original post
        // time would otherwise put it outside the take window.
        orderBy: { lastEngagementAt: 'desc' },
        take: ACTIVITY_LIMIT,
      })
    : []

  const feed = await formatActivities(activities, {
    isFavourited: (a) =>
      (a.venueId && favouritedVenueIds.has(a.venueId)) ||
      (a.businessId && favouritedBusinessIds.has(a.businessId)),
  })

  const commonGroundPeople = await getCommonGroundPeople(req.userId, suggestionScopeAncestors)

  const signupActivitiesRaw = await prisma.activity.findMany({
    where: {
      type: 'SIGNUP',
      actorUserId: { not: req.userId },
      actorUser: { isBlocked: false, ...(profileScopeWhere ? { profile: profileScopeWhere } : {}) },
    },
    include: { actorUser: { include: { profile: { include: { city: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: SIGNUP_LIMIT,
  })
  const signupFeed = await formatActivities(signupActivitiesRaw)

  const suggestions = commonGroundPeople.slice(0, SUGGESTION_LIMIT)

  const combinedActivities = [...feed, ...signupFeed].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  res.json({ activities: combinedActivities, suggestions })
})

module.exports = router
