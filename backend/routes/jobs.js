const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { canEditVenue } = require('./venues')
const { buildConnectionsAdjacency } = require('../lib/connectionStatus')
const { displayName } = require('../lib/displayName')
const { resolveScopeForRequest, resolveScopeAncestors, venueLocationWhere } = require('../lib/location')

const router = express.Router()
router.use(requireAuth)

const jobInclude = {
  venue: { include: { city: { include: { state: { include: { country: true } } } }, suburb: true } },
  skills: { include: { skill: true } },
  knowledgeAreas: { include: { knowledgeArea: true } },
  hiredApplicantUser: { include: { profile: true } },
  _count: { select: { applications: true } },
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

async function getManagedVenueIds(userId) {
  const rows = await prisma.venueManager.findMany({ where: { userId }, select: { venueId: true } })
  return rows.map((r) => r.venueId)
}

async function getAppliedJobIds(userId, jobIds) {
  if (jobIds.length === 0) return new Set()
  const applications = await prisma.jobApplication.findMany({
    where: { applicantUserId: userId, jobId: { in: jobIds } },
    select: { jobId: true },
  })
  return new Set(applications.map((a) => a.jobId))
}

// Viewer-specific context reused across a single list/detail request: the
// viewer's own Skills/KnowledgeAreas (for match counts), which venues they
// follow/favourite, and who they're connected to (for mutual-connections).
async function getViewerContext(userId) {
  const [profile, venueFollows, adjacency] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, include: { skills: true, knowledgeAreas: true } }),
    prisma.venueFollow.findMany({ where: { userId } }),
    buildConnectionsAdjacency(),
  ])

  return {
    mySkillIds: new Set((profile?.skills || []).map((s) => s.id)),
    myKnowledgeAreaIds: new Set((profile?.knowledgeAreas || []).map((k) => k.id)),
    followedVenueIds: new Set(venueFollows.map((f) => f.venueId)),
    favouritedVenueIds: new Set(venueFollows.filter((f) => f.isFavourite).map((f) => f.venueId)),
    myConnections: adjacency.get(userId) || new Set(),
  }
}

// Counts, per venue, how many of the viewer's accepted connections have a
// current or previous Experience entry there.
async function getMutualConnectionsAtVenues(venueIds, myConnections) {
  if (venueIds.length === 0 || myConnections.size === 0) return new Map()

  const experiences = await prisma.experience.findMany({
    where: { venueId: { in: venueIds }, profile: { userId: { in: [...myConnections] } } },
    select: { venueId: true, profile: { select: { userId: true } } },
  })

  const usersByVenue = new Map()
  for (const e of experiences) {
    if (!usersByVenue.has(e.venueId)) usersByVenue.set(e.venueId, new Set())
    usersByVenue.get(e.venueId).add(e.profile.userId)
  }

  const counts = new Map()
  for (const [venueId, userIds] of usersByVenue) counts.set(venueId, userIds.size)
  return counts
}

function shapeJob(job, ctx, mutualConnectionsMap, appliedJobIds) {
  const jobSkillIds = job.skills.map((js) => js.skillId)
  const jobKnowledgeAreaIds = job.knowledgeAreas.map((jk) => jk.knowledgeAreaId)

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    status: job.status,
    filledStatus: job.filledStatus,
    hiredApplicant: job.hiredApplicantUser
      ? { id: job.hiredApplicantUser.id, name: displayName(job.hiredApplicantUser) }
      : null,
    createdAt: job.createdAt,
    postedByUserId: job.postedByUserId,
    venueId: job.venueId,
    venue: {
      ...job.venue,
      isFollowing: ctx.followedVenueIds.has(job.venueId),
      isFavourite: ctx.favouritedVenueIds.has(job.venueId),
    },
    skills: job.skills.map((js) => js.skill),
    knowledgeAreas: job.knowledgeAreas.map((jk) => jk.knowledgeArea),
    skillMatchCount: jobSkillIds.filter((id) => ctx.mySkillIds.has(id)).length,
    knowledgeMatchCount: jobKnowledgeAreaIds.filter((id) => ctx.myKnowledgeAreaIds.has(id)).length,
    mutualConnectionsAtVenue: mutualConnectionsMap.get(job.venueId) || 0,
    applicationCount: job._count?.applications ?? 0,
    hasApplied: appliedJobIds.has(job.id),
  }
}

function compareJobsRecent(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt)
}

// Tiered comparator mirroring Discover's common-ground lens: skill matches
// first, then knowledge-area matches, falling back to recency for ties.
function compareJobsMatch(a, b) {
  if (b.skillMatchCount !== a.skillMatchCount) return b.skillMatchCount - a.skillMatchCount
  if (b.knowledgeMatchCount !== a.knowledgeMatchCount) return b.knowledgeMatchCount - a.knowledgeMatchCount
  return compareJobsRecent(a, b)
}

router.get('/jobs', async (req, res) => {
  const venueId =
    typeof req.query.venueId === 'string' && req.query.venueId.trim() ? req.query.venueId.trim() : null
  const mine = req.query.mine === 'true'
  // Neither "My Jobs" nor a specific venue's job list is location-filterable
  // - both are already scoped by ownership/venue identity, not location - so
  // an omitted scope means "no filter" here rather than defaulting to the
  // viewer's own location (see resolveScopeForRequest).
  const scope = await resolveScopeForRequest(req, '', !(mine || venueId))
  const scopeAncestors = await resolveScopeAncestors(scope)
  const sort = req.query.sort === 'match' ? 'match' : 'recent'
  const statusParam =
    req.query.status === 'OPEN' || req.query.status === 'CLOSED' ? req.query.status : null
  // The general directory defaults to OPEN-only; a venue's own job list and
  // "My Jobs" default to showing every status so closed jobs stay visible.
  const status = statusParam || (venueId || mine ? undefined : 'OPEN')

  const managedVenueIds = await getManagedVenueIds(req.userId)

  if (mine && managedVenueIds.length === 0) {
    return res.json({ jobs: [], sort: 'recent' })
  }

  const venueScopeWhere = venueLocationWhere(scopeAncestors)
  const where = {
    ...(status ? { status } : {}),
    ...(Object.keys(venueScopeWhere).length ? { venue: venueScopeWhere } : {}),
    ...(mine
      ? { venueId: { in: managedVenueIds } }
      : {
          ...(venueId ? { venueId } : {}),
          // Jobs at venues the viewer manages are excluded from the general
          // directory — those surface on "My Jobs" instead. Doesn't apply
          // when browsing one specific venue's own job list (venueId given).
          ...(!venueId && managedVenueIds.length > 0 ? { venueId: { notIn: managedVenueIds } } : {}),
        }),
  }

  const jobs = await prisma.job.findMany({ where, include: jobInclude, orderBy: { createdAt: 'desc' } })

  const ctx = await getViewerContext(req.userId)
  const jobVenueIds = [...new Set(jobs.map((j) => j.venueId))]
  const mutualConnectionsMap = await getMutualConnectionsAtVenues(jobVenueIds, ctx.myConnections)
  const appliedJobIds = await getAppliedJobIds(req.userId, jobs.map((j) => j.id))

  const shaped = jobs.map((j) => shapeJob(j, ctx, mutualConnectionsMap, appliedJobIds))

  if (mine) {
    return res.json({ jobs: shaped.sort(compareJobsRecent), sort: 'recent' })
  }

  const comparator = sort === 'match' ? compareJobsMatch : compareJobsRecent
  const followed = shaped.filter((j) => j.venue.isFollowing).sort(comparator)
  const notFollowed = shaped.filter((j) => !j.venue.isFollowing).sort(comparator)

  res.json({ jobs: [...followed, ...notFollowed], sort })
})

router.get('/jobs/:id', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: jobInclude })
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  const ctx = await getViewerContext(req.userId)
  const mutualConnectionsMap = await getMutualConnectionsAtVenues([job.venueId], ctx.myConnections)

  const [canEdit, myApplication] = await Promise.all([
    canEditVenue(req.userId, job.venueId),
    prisma.jobApplication.findUnique({
      where: { jobId_applicantUserId: { jobId: job.id, applicantUserId: req.userId } },
    }),
  ])
  const appliedJobIds = myApplication ? new Set([job.id]) : new Set()

  res.json({
    job: {
      ...shapeJob(job, ctx, mutualConnectionsMap, appliedJobIds),
      canEdit,
      myApplicationNote: myApplication?.note || null,
    },
  })
})

router.post('/jobs', async (req, res) => {
  const { venueId, title, description, skillIds, knowledgeAreaIds } = req.body || {}

  if (typeof venueId !== 'string' || !venueId.trim()) {
    return res.status(400).json({ error: 'Venue is required' })
  }
  const venue = await prisma.venue.findUnique({ where: { id: venueId.trim() } })
  if (!venue) {
    return res.status(400).json({ error: 'Selected venue was not found' })
  }

  const allowed = await canEditVenue(req.userId, venue.id)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to post a job for this venue' })
  }

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Job title is required' })
  }
  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Job description is required' })
  }

  const validSkillIds = await validateSkillIds(parseIds(skillIds))
  const validKnowledgeAreaIds = await validateKnowledgeAreaIds(parseIds(knowledgeAreaIds))

  const job = await prisma.job.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      venueId: venue.id,
      postedByUserId: req.userId,
      skills: { create: validSkillIds.map((skillId) => ({ skillId })) },
      knowledgeAreas: { create: validKnowledgeAreaIds.map((knowledgeAreaId) => ({ knowledgeAreaId })) },
    },
    include: jobInclude,
  })

  await prisma.activity.create({
    data: { type: 'JOB_POSTED', actorUserId: req.userId, venueId: venue.id, jobId: job.id },
  })

  const ctx = await getViewerContext(req.userId)
  const mutualConnectionsMap = await getMutualConnectionsAtVenues([job.venueId], ctx.myConnections)
  res.status(201).json({
    job: { ...shapeJob(job, ctx, mutualConnectionsMap, new Set()), canEdit: true, myApplicationNote: null },
  })
})

router.put('/jobs/:id', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } })
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  const allowed = await canEditVenue(req.userId, job.venueId)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to edit this job' })
  }

  const { title, description, status, filledStatus, hiredApplicantUserId, skillIds, knowledgeAreaIds } =
    req.body || {}
  const data = {}

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Job title is required' })
    }
    data.title = title.trim()
  }
  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Job description is required' })
    }
    data.description = description.trim()
  }
  if (status !== undefined) {
    if (status !== 'OPEN' && status !== 'CLOSED') {
      return res.status(400).json({ error: 'Invalid job status' })
    }
    data.status = status
  }
  // Captured once when closing: "Did you find the right person?" Yes/No,
  // and (only if Yes) optionally which applicant. hiredApplicantUserId must
  // reference an actual applicant of this job, not just any user.
  if (filledStatus !== undefined) {
    if (filledStatus !== null && filledStatus !== 'FILLED' && filledStatus !== 'NOT_FILLED') {
      return res.status(400).json({ error: 'Invalid filled status' })
    }
    data.filledStatus = filledStatus
    if (filledStatus !== 'FILLED') data.hiredApplicantUserId = null
  }
  if (hiredApplicantUserId !== undefined && filledStatus === 'FILLED') {
    if (hiredApplicantUserId === null || hiredApplicantUserId === '') {
      data.hiredApplicantUserId = null
    } else {
      const application = await prisma.jobApplication.findUnique({
        where: { jobId_applicantUserId: { jobId: job.id, applicantUserId: hiredApplicantUserId } },
      })
      if (!application) {
        return res.status(400).json({ error: 'Selected user did not apply to this job' })
      }
      data.hiredApplicantUserId = hiredApplicantUserId
    }
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

  const updated = await prisma.job.update({ where: { id: job.id }, data, include: jobInclude })

  const ctx = await getViewerContext(req.userId)
  const mutualConnectionsMap = await getMutualConnectionsAtVenues([updated.venueId], ctx.myConnections)
  const appliedJobIds = await getAppliedJobIds(req.userId, [updated.id])
  res.json({ job: { ...shapeJob(updated, ctx, mutualConnectionsMap, appliedJobIds), canEdit: true } })
})

router.post('/jobs/:id/apply', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } })
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  const managesVenue = await canEditVenue(req.userId, job.venueId)
  if (managesVenue) {
    return res.status(403).json({ error: 'You cannot apply to a job at a venue you manage' })
  }

  if (job.status !== 'OPEN') {
    return res.status(400).json({ error: 'This job is no longer accepting applications' })
  }

  const { note } = req.body || {}
  const trimmedNote = typeof note === 'string' && note.trim() ? note.trim() : null

  const application = await prisma.jobApplication.upsert({
    where: { jobId_applicantUserId: { jobId: job.id, applicantUserId: req.userId } },
    create: { jobId: job.id, applicantUserId: req.userId, note: trimmedNote },
    update: { note: trimmedNote },
  })

  res.status(201).json({ application })
})

router.get('/jobs/:id/applications', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { skills: true, knowledgeAreas: true },
  })
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  const allowed = await canEditVenue(req.userId, job.venueId)
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to view applications for this job' })
  }

  const jobSkillIds = job.skills.map((js) => js.skillId)
  const jobKnowledgeAreaIds = job.knowledgeAreas.map((jk) => jk.knowledgeAreaId)

  const applications = await prisma.jobApplication.findMany({
    where: { jobId: job.id },
    include: {
      applicantUser: {
        include: { profile: { include: { city: true, skills: true, knowledgeAreas: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Mutual connections are scoped to each applicant, not the viewer: how many
  // of the applicant's own accepted connections have current/previous
  // Experience at this venue.
  const adjacency = await buildConnectionsAdjacency()
  const applicantConnections = applications.map((a) => adjacency.get(a.applicantUserId) || new Set())
  const allConnectedUserIds = [...new Set(applicantConnections.flatMap((s) => [...s]))]

  const experiencedUserIds = allConnectedUserIds.length
    ? new Set(
        (
          await prisma.experience.findMany({
            where: { venueId: job.venueId, profile: { userId: { in: allConnectedUserIds } } },
            select: { profile: { select: { userId: true } } },
          })
        ).map((e) => e.profile.userId),
      )
    : new Set()

  res.json({
    applications: applications.map((a, i) => {
      const applicantSkillIds = new Set((a.applicantUser.profile?.skills || []).map((s) => s.id))
      const applicantKnowledgeAreaIds = new Set(
        (a.applicantUser.profile?.knowledgeAreas || []).map((k) => k.id),
      )
      const mutualConnectionsAtVenue = [...applicantConnections[i]].filter((id) =>
        experiencedUserIds.has(id),
      ).length

      return {
        id: a.id,
        note: a.note,
        createdAt: a.createdAt,
        skillMatchCount: jobSkillIds.filter((id) => applicantSkillIds.has(id)).length,
        knowledgeMatchCount: jobKnowledgeAreaIds.filter((id) => applicantKnowledgeAreaIds.has(id)).length,
        mutualConnectionsAtVenue,
        applicant: {
          id: a.applicantUser.id,
          email: a.applicantUser.email,
          profile: a.applicantUser.profile
            ? {
                firstName: a.applicantUser.profile.firstName,
                lastName: a.applicantUser.profile.lastName,
                professionalTitle: a.applicantUser.profile.professionalTitle,
                city: a.applicantUser.profile.city,
              }
            : null,
        },
      }
    }),
  })
})

// --- Admin listing (admin only) ---

router.get('/admin/jobs', requireAdmin, async (req, res) => {
  const jobs = await prisma.job.findMany({
    include: {
      venue: { select: { id: true, name: true } },
      postedByUser: { include: { profile: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      createdAt: j.createdAt,
      venue: j.venue,
      postedBy: { id: j.postedByUser.id, name: displayName(j.postedByUser) },
      applicationCount: j._count.applications,
    })),
  })
})

module.exports = router
