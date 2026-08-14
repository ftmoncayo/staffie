const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const profileInclude = {
  skills: true,
  experiences: { orderBy: { startDate: 'desc' } },
  certifications: { orderBy: { issueDate: 'desc' } },
}

function getOwnedProfile(userId) {
  return prisma.profile.findUnique({ where: { userId }, include: profileInclude })
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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
  const { city, professionalTitle, rightToWork, culturalIdentity } = req.body || {}

  if (typeof professionalTitle !== 'string' || !professionalTitle.trim()) {
    return res.status(400).json({ error: 'Professional title is required' })
  }
  if (typeof rightToWork !== 'boolean') {
    return res.status(400).json({ error: 'Right to work status is required' })
  }

  const data = {
    professionalTitle: professionalTitle.trim(),
    rightToWork,
    city: typeof city === 'string' && city.trim() ? city.trim() : null,
    culturalIdentity:
      typeof culturalIdentity === 'string' && culturalIdentity.trim()
        ? culturalIdentity.trim()
        : null,
  }

  await prisma.profile.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId, ...data },
    update: data,
  })

  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
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
  }
  const profile = await getOwnedProfile(req.userId)
  res.json({ profile })
})

// --- Experience ---

router.post('/experience', requireProfile, async (req, res) => {
  const { venueName, roleTitle, startDate, endDate, isCurrent } = req.body || {}

  if (
    typeof venueName !== 'string' ||
    !venueName.trim() ||
    typeof roleTitle !== 'string' ||
    !roleTitle.trim()
  ) {
    return res.status(400).json({ error: 'Venue name and role title are required' })
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
      venueName: venueName.trim(),
      roleTitle: roleTitle.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      isCurrent: current,
    },
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

  const { venueName, roleTitle, startDate, endDate, isCurrent } = req.body || {}

  if (
    typeof venueName !== 'string' ||
    !venueName.trim() ||
    typeof roleTitle !== 'string' ||
    !roleTitle.trim()
  ) {
    return res.status(400).json({ error: 'Venue name and role title are required' })
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
      venueName: venueName.trim(),
      roleTitle: roleTitle.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      isCurrent: current,
    },
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
  const { name, issueDate, expiryDate } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Certification name is required' })
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
      name: name.trim(),
      issueDate: parsedIssue,
      expiryDate: parsedExpiry,
    },
  })

  res.status(201).json({ certification })
})

router.put('/certifications/:id', requireProfile, async (req, res) => {
  const existing = await prisma.certification.findFirst({
    where: { id: req.params.id, profileId: req.profile.id },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Certification not found' })
  }

  const { name, issueDate, expiryDate } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Certification name is required' })
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
      name: name.trim(),
      issueDate: parsedIssue,
      expiryDate: parsedExpiry,
    },
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
