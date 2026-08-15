const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const {
  buildConnectionStatusMap,
  connectionStatusFor,
  buildConnectionsAdjacency,
} = require('../lib/connectionStatus')

const router = express.Router()
router.use(requireAuth)

function formatProfile(profile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    professionalTitle: profile.professionalTitle,
    city: profile.city,
  }
}

async function getCommonGroundPeople(userId) {
  const myProfile = await prisma.profile.findUnique({
    where: { userId },
    include: { skills: true, knowledgeAreas: true, experiences: { select: { venueId: true } } },
  })

  const statusByUserId = await buildConnectionStatusMap(userId)

  const mySkillIds = new Set((myProfile?.skills || []).map((s) => s.id))
  const myKnowledgeAreaIds = new Set((myProfile?.knowledgeAreas || []).map((k) => k.id))
  const myVenueIds = new Set((myProfile?.experiences || []).map((e) => e.venueId))

  const adjacency = await buildConnectionsAdjacency()
  const myConnections = adjacency.get(userId) || new Set()

  const profiles = await prisma.profile.findMany({
    where: { userId: { not: userId } },
    include: {
      user: true,
      city: true,
      skills: true,
      knowledgeAreas: true,
      experiences: { select: { venueId: true } },
    },
  })

  const people = profiles.map((p) => {
    const sharedSkills = p.skills.filter((s) => mySkillIds.has(s.id)).length
    const sharedKnowledgeAreas = p.knowledgeAreas.filter((k) => myKnowledgeAreaIds.has(k.id)).length
    const theirVenueIds = new Set(p.experiences.map((e) => e.venueId))
    const sharedVenues = [...theirVenueIds].filter((id) => myVenueIds.has(id)).length
    const theirConnections = adjacency.get(p.userId) || new Set()
    const mutualConnections = [...myConnections].filter((id) => theirConnections.has(id)).length

    return {
      id: p.user.id,
      email: p.user.email,
      profile: formatProfile(p),
      ...connectionStatusFor(statusByUserId, p.userId),
      shared: {
        skills: sharedSkills,
        knowledgeAreas: sharedKnowledgeAreas,
        venues: sharedVenues,
        connections: mutualConnections,
        total: sharedSkills + sharedKnowledgeAreas + sharedVenues + mutualConnections,
      },
    }
  })

  people.sort((a, b) => b.shared.total - a.shared.total)

  return people
}

router.get('/discover/people', async (req, res) => {
  const lens = req.query.lens === 'common' ? 'common' : 'near'

  if (lens === 'common') {
    const people = await getCommonGroundPeople(req.userId)
    return res.json({ lens, people })
  }

  const myProfile = await prisma.profile.findUnique({ where: { userId: req.userId } })
  if (!myProfile?.cityId) {
    return res.json({ lens, people: [] })
  }

  const statusByUserId = await buildConnectionStatusMap(req.userId)

  const profiles = await prisma.profile.findMany({
    where: { cityId: myProfile.cityId, userId: { not: req.userId } },
    include: { user: true, city: true },
    orderBy: { firstName: 'asc' },
  })

  const people = profiles.map((p) => ({
    id: p.user.id,
    email: p.user.email,
    profile: formatProfile(p),
    ...connectionStatusFor(statusByUserId, p.userId),
  }))

  res.json({ lens, people })
})

module.exports = router
module.exports.getCommonGroundPeople = getCommonGroundPeople
