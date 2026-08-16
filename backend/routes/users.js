const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { displayName } = require('../lib/displayName')

const router = express.Router()
router.use(requireAuth)

router.get('/users', requireAdmin, async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  const users = await prisma.user.findMany({
    where: search
      ? {
          profile: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : undefined,
    select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
    orderBy: [{ profile: { firstName: 'asc' } }, { profile: { lastName: 'asc' } }],
    take: 20,
  })

  res.json({ users: users.map((u) => ({ id: u.id, email: u.email, name: displayName(u) })) })
})

// --- Admin user management (isAdmin only) ---

router.get('/admin/users', requireAdmin, async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { profile: { firstName: { contains: search, mode: 'insensitive' } } },
            { profile: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    select: {
      id: true,
      email: true,
      isAdmin: true,
      isVenueAdmin: true,
      isBlocked: true,
      profile: { select: { firstName: true, lastName: true } },
      managedVenues: { select: { venue: { select: { id: true, name: true } } } },
      managedBusinesses: { select: { business: { select: { id: true, name: true } } } },
    },
    orderBy: [{ profile: { lastName: 'asc' } }, { profile: { firstName: 'asc' } }],
  })

  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.profile ? [u.profile.firstName, u.profile.lastName].filter(Boolean).join(' ') : null,
      email: u.email,
      isAdmin: u.isAdmin,
      isVenueAdmin: u.isVenueAdmin,
      isBlocked: u.isBlocked,
      managedVenues: u.managedVenues.map((m) => m.venue),
      managedBusinesses: u.managedBusinesses.map((m) => m.business),
    })),
  })
})

router.put('/admin/users/:id/flags', requireAdmin, async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { isAdmin, isVenueAdmin } = req.body || {}
  const data = {}
  if (typeof isAdmin === 'boolean') data.isAdmin = isAdmin
  if (typeof isVenueAdmin === 'boolean') data.isVenueAdmin = isVenueAdmin

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'isAdmin or isVenueAdmin must be provided' })
  }

  const user = await prisma.user.update({ where: { id: existing.id }, data })

  res.json({
    user: { id: user.id, email: user.email, isAdmin: user.isAdmin, isVenueAdmin: user.isVenueAdmin },
  })
})

router.put('/admin/users/:id/block', requireAdmin, async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'User not found' })
  }

  const user = await prisma.user.update({ where: { id: existing.id }, data: { isBlocked: true } })
  res.json({ user: { id: user.id, email: user.email, isBlocked: user.isBlocked } })
})

router.put('/admin/users/:id/unblock', requireAdmin, async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'User not found' })
  }

  const user = await prisma.user.update({ where: { id: existing.id }, data: { isBlocked: false } })
  res.json({ user: { id: user.id, email: user.email, isBlocked: user.isBlocked } })
})

module.exports = router
