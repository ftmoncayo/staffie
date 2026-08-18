const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

const SETTINGS_ID = 'singleton'

// Public: only tells the frontend whether to show the code field, never the
// code itself.
router.get('/registration-settings', async (req, res) => {
  const settings = await prisma.registrationSettings.findUnique({ where: { id: SETTINGS_ID } })
  res.json({ requireCode: Boolean(settings?.requireCode) })
})

router.get('/admin/registration-settings', requireAuth, requireAdmin, async (req, res) => {
  const settings = await prisma.registrationSettings.findUnique({ where: { id: SETTINGS_ID } })
  res.json({ settings: { requireCode: settings.requireCode, currentCode: settings.currentCode } })
})

// Lightweight, testing-phase feature: setting a new currentCode immediately
// invalidates the previous one — only the single current value is ever
// checked against, no history is kept.
router.put('/admin/registration-settings', requireAuth, requireAdmin, async (req, res) => {
  const { requireCode, currentCode } = req.body || {}
  const data = {}

  if (requireCode !== undefined) {
    if (typeof requireCode !== 'boolean') {
      return res.status(400).json({ error: 'requireCode must be a boolean' })
    }
    data.requireCode = requireCode
  }
  if (currentCode !== undefined) {
    if (currentCode !== null && (typeof currentCode !== 'string' || !currentCode.trim())) {
      return res.status(400).json({ error: 'currentCode must be a non-empty string or null' })
    }
    data.currentCode = currentCode === null ? null : currentCode.trim()
  }

  const updated = await prisma.registrationSettings.update({ where: { id: SETTINGS_ID }, data })
  res.json({ settings: { requireCode: updated.requireCode, currentCode: updated.currentCode } })
})

// Public: lets an unregistered applicant pick from live venues on the
// waitlist form (venue names aren't sensitive — logged-in users already
// browse the full directory). No pagination/search since this app is still
// in its lightweight testing phase.
router.get('/waitlist/venues', async (req, res) => {
  const venues = await prisma.venue.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
  res.json({ venues })
})

// venueId and otherVenueName are mutually exclusive — an applicant either
// points at a venue already on Staffie or names one that isn't listed yet.
router.post('/waitlist', async (req, res) => {
  const { email, name, venueId, otherVenueName } = req.body || {}

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const trimmedVenueId = typeof venueId === 'string' && venueId.trim() ? venueId.trim() : null
  const trimmedOtherVenueName =
    typeof otherVenueName === 'string' && otherVenueName.trim() ? otherVenueName.trim() : null

  if (trimmedVenueId && trimmedOtherVenueName) {
    return res.status(400).json({ error: 'Choose an existing venue or enter a new one, not both' })
  }

  if (trimmedVenueId) {
    const venue = await prisma.venue.findUnique({ where: { id: trimmedVenueId } })
    if (!venue) {
      return res.status(400).json({ error: 'Selected venue was not found' })
    }
  }

  const entry = await prisma.waitlist.create({
    data: {
      email: email.trim().toLowerCase(),
      name: typeof name === 'string' && name.trim() ? name.trim() : null,
      venueId: trimmedVenueId,
      otherVenueName: trimmedOtherVenueName,
    },
  })

  res.status(201).json({ waitlistEntry: { id: entry.id } })
})

router.get('/admin/waitlist', requireAuth, requireAdmin, async (req, res) => {
  const entries = await prisma.waitlist.findMany({
    include: { venue: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ waitlist: entries })
})

module.exports = router
