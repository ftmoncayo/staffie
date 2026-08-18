const prisma = require('./prisma')

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

// NOTICE_POSTED is the only type where lastEngagementAt (bumped on every new
// comment — see routes/engagement.js) can differ from createdAt; every other
// type just has the two equal, so using this everywhere is safe.
function effectiveDate(a) {
  return a.type === 'NOTICE_POSTED' ? a.lastEngagementAt : a.createdAt
}

// Resolves the "other party" for CONNECTION_MADE activities by matching on the
// exact respondedAt timestamp shared with the Activity.createdAt at creation time.
async function formatActivities(activities, { isFavourited = () => false } = {}) {
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

  const formatted = activities.map((a) => {
    const counterpartId = counterpartByActorAndTime.get(`${a.actorUserId}_${a.createdAt.getTime()}`)
    return {
      id: a.id,
      type: a.type,
      // NOTICE_POSTED reports lastEngagementAt here instead of the raw
      // createdAt — both its displayed date and (via the sort below) its
      // feed position track the notice's most recent comment.
      createdAt: effectiveDate(a),
      favourited: Boolean(isFavourited(a)),
      actor: formatActor(a.actorUser),
      counterpart: counterpartId ? formatActor(counterpartById.get(counterpartId)) : null,
      venue: a.venue || null,
      business: a.business || null,
      notice: a.notice ? { content: a.notice.content } : null,
      job: a.job ? { id: a.job.id, title: a.job.title } : null,
      experience: a.experience ? { roleTitle: a.experience.roleTitle } : null,
    }
  })

  return formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

module.exports = { formatActor, formatActivities }
