const prisma = require('./prisma')
const { displayName } = require('./displayName')

const PEER_NOTIFY_LIMIT = 6

function computeLevel(rows) {
  if (rows.some((r) => r.endorserRole === 'MANAGER')) return 3
  if (rows.some((r) => r.endorserRole === 'PEER')) return 2
  return 1
}

// "Verified by" for the item's current level: every MANAGER endorser's name
// once any manager has weighed in (that's what makes it Level 3), else every
// PEER endorser's name (Level 2), else "Not yet verified" (Level 1).
function computeVerifiedBy(rows, nameById) {
  const managerNames = [
    ...new Set(rows.filter((r) => r.endorserRole === 'MANAGER').map((r) => nameById.get(r.endorserUserId))),
  ]
  if (managerNames.length > 0) return managerNames.join(', ')

  const peerNames = [
    ...new Set(rows.filter((r) => r.endorserRole === 'PEER').map((r) => nameById.get(r.endorserUserId))),
  ]
  if (peerNames.length > 0) return peerNames.join(', ')

  return 'Not yet verified'
}

// Attaches a derived `level` (1/2/3) and `verifiedBy` to every
// skill/knowledgeArea on a profile via one batched Endorsement query
// (grouped in memory) plus one batched User lookup for endorser names —
// never query per item, that's an N+1 on every profile view.
async function attachEndorsementLevels(profile) {
  if (!profile) return profile

  const endorsements = await prisma.endorsement.findMany({ where: { profileId: profile.id } })

  const endorserUserIds = [...new Set(endorsements.map((e) => e.endorserUserId))]
  const endorserUsers = endorserUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: endorserUserIds } }, include: { profile: true } })
    : []
  const nameById = new Map(endorserUsers.map((u) => [u.id, displayName(u)]))

  const byItem = new Map()
  for (const e of endorsements) {
    const key = `${e.itemType}:${e.itemId}`
    if (!byItem.has(key)) byItem.set(key, [])
    byItem.get(key).push(e)
  }

  const skills = (profile.skills || []).map((s) => {
    const rows = byItem.get(`SKILL:${s.id}`) || []
    return { ...s, level: computeLevel(rows), verifiedBy: computeVerifiedBy(rows, nameById) }
  })
  const knowledgeAreas = (profile.knowledgeAreas || []).map((k) => {
    const rows = byItem.get(`KNOWLEDGE_AREA:${k.id}`) || []
    return { ...k, level: computeLevel(rows), verifiedBy: computeVerifiedBy(rows, nameById) }
  })

  return { ...profile, skills, knowledgeAreas }
}

async function getWorkerVenueIds(workerProfileId) {
  const experiences = await prisma.experience.findMany({
    where: { profileId: workerProfileId },
    select: { venueId: true },
    distinct: ['venueId'],
  })
  return experiences.map((e) => e.venueId)
}

function experiencesOverlap(a, b) {
  const aEnd = a.isCurrent || !a.endDate ? Infinity : a.endDate.getTime()
  const bEnd = b.isCurrent || !b.endDate ? Infinity : b.endDate.getTime()
  return a.startDate.getTime() <= bEnd && b.startDate.getTime() <= aEnd
}

function overlapRank(a, b) {
  const aEnd = a.isCurrent || !a.endDate ? Infinity : a.endDate.getTime()
  const bEnd = b.isCurrent || !b.endDate ? Infinity : b.endDate.getTime()
  return Math.min(aEnd, bEnd)
}

// Other users with date-overlapping Experience at any venue the worker has
// also worked (past or present), ranked by how recent that overlap was.
// Returns the full ranked list (uncapped) — callers that are deciding who to
// NOTIFY should slice to PEER_NOTIFY_LIMIT; callers checking whether a
// specific person is still allowed to endorse should use the full list.
async function getEligiblePeerUserIds(workerProfileId, workerUserId) {
  const workerExperiences = await prisma.experience.findMany({ where: { profileId: workerProfileId } })
  if (workerExperiences.length === 0) return []

  const venueIds = [...new Set(workerExperiences.map((e) => e.venueId))]

  const otherExperiences = await prisma.experience.findMany({
    where: { venueId: { in: venueIds }, profileId: { not: workerProfileId } },
    include: { profile: { select: { userId: true, user: { select: { isBlocked: true } } } } },
  })

  const bestRankByUserId = new Map()
  for (const mine of workerExperiences) {
    for (const theirs of otherExperiences) {
      if (theirs.venueId !== mine.venueId) continue
      if (theirs.profile.userId === workerUserId) continue
      if (theirs.profile.user.isBlocked) continue
      if (!experiencesOverlap(mine, theirs)) continue

      const rank = overlapRank(mine, theirs)
      const existing = bestRankByUserId.get(theirs.profile.userId)
      if (existing === undefined || rank > existing) {
        bestRankByUserId.set(theirs.profile.userId, rank)
      }
    }
  }

  return [...bestRankByUserId.entries()].sort((a, b) => b[1] - a[1]).map(([userId]) => userId)
}

// All current, verified managers of any venue in the worker's Experience
// history — no recency cap, unlike peers.
async function getEligibleManagerUserIds(venueIds, excludeUserId) {
  if (venueIds.length === 0) return []
  const managers = await prisma.venueManager.findMany({
    where: { venueId: { in: venueIds }, verified: true },
    select: { userId: true },
  })
  return [...new Set(managers.map((m) => m.userId))].filter((id) => id !== excludeUserId)
}

async function isEligibleManagerFor(managerUserId, workerProfileId) {
  const venueIds = await getWorkerVenueIds(workerProfileId)
  if (venueIds.length === 0) return false
  const manager = await prisma.venueManager.findFirst({
    where: { userId: managerUserId, venueId: { in: venueIds }, verified: true },
  })
  return Boolean(manager)
}

async function isEligiblePeerFor(candidateUserId, workerProfileId, workerUserId) {
  const peers = await getEligiblePeerUserIds(workerProfileId, workerUserId)
  return peers.includes(candidateUserId)
}

// A MANAGER endorsement maxes an item out at Level 3 — every other pending
// endorsement-request notification for that exact item (across everyone who
// was asked) becomes moot and is cleared.
async function clearPendingEndorsementRequests({ workerUserId, itemType, itemId }) {
  await prisma.notification.updateMany({
    where: {
      type: 'ENDORSEMENT_REQUEST',
      sourceUserId: workerUserId,
      targetType: itemType,
      targetId: itemId,
      dismissed: false,
    },
    data: { dismissed: true },
  })
}

module.exports = {
  PEER_NOTIFY_LIMIT,
  attachEndorsementLevels,
  getWorkerVenueIds,
  getEligiblePeerUserIds,
  getEligibleManagerUserIds,
  isEligibleManagerFor,
  isEligiblePeerFor,
  clearPendingEndorsementRequests,
}
