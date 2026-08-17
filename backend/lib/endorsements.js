const prisma = require('./prisma')

const PEER_NOTIFY_LIMIT = 6

function computeLevel(rows) {
  if (rows.some((r) => r.endorserRole === 'MANAGER')) return 3
  if (rows.some((r) => r.endorserRole === 'PEER')) return 2
  return 1
}

// Attaches a derived `level` (1/2/3) to every skill/knowledgeArea on a
// profile via a single batched Endorsement query, grouped in memory — never
// query per item, that's an N+1 on every profile view.
async function attachEndorsementLevels(profile) {
  if (!profile) return profile

  const endorsements = await prisma.endorsement.findMany({ where: { profileId: profile.id } })

  const byItem = new Map()
  for (const e of endorsements) {
    const key = `${e.itemType}:${e.itemId}`
    if (!byItem.has(key)) byItem.set(key, [])
    byItem.get(key).push(e)
  }

  const skills = (profile.skills || []).map((s) => ({
    ...s,
    level: computeLevel(byItem.get(`SKILL:${s.id}`) || []),
  }))
  const knowledgeAreas = (profile.knowledgeAreas || []).map((k) => ({
    ...k,
    level: computeLevel(byItem.get(`KNOWLEDGE_AREA:${k.id}`) || []),
  }))

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
