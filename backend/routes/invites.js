const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { sendInvite } = require('../lib/invites')

const router = express.Router()
router.use(requireAuth)

router.post('/invites', async (req, res) => {
  const { email, venueId } = req.body || {}

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' })
  }

  let venue = null
  if (typeof venueId === 'string' && venueId.trim()) {
    venue = await prisma.venue.findUnique({ where: { id: venueId.trim() } })
    if (!venue) {
      return res.status(400).json({ error: 'Selected venue was not found' })
    }
  }

  try {
    const result = await sendInvite({
      inviterUserId: req.userId,
      inviteeEmail: email,
      type: venue ? 'VENUE_COWORKER' : 'GENERAL',
      venueId: venue?.id || null,
    })
    res.status(201).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
