const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

function formatUser(user) {
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

const userWithProfileInclude = {
  profile: { include: { city: true } },
}

router.post('/connections/request', async (req, res) => {
  const { toUserId } = req.body || {}

  if (typeof toUserId !== 'string' || !toUserId.trim()) {
    return res.status(400).json({ error: 'toUserId is required' })
  }
  const targetId = toUserId.trim()

  if (targetId === req.userId) {
    return res.status(400).json({ error: 'You cannot connect with yourself' })
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetId } })
  if (!targetUser) {
    return res.status(400).json({ error: 'Selected user was not found' })
  }

  const existing = await prisma.connectionRequest.findFirst({
    where: {
      OR: [
        { fromUserId: req.userId, toUserId: targetId },
        { fromUserId: targetId, toUserId: req.userId },
      ],
    },
  })
  if (existing) {
    return res.status(200).json({ request: existing, created: false })
  }

  const request = await prisma.connectionRequest.create({
    data: { fromUserId: req.userId, toUserId: targetId },
  })

  res.status(201).json({ request, created: true })
})

router.get('/connections/requests', async (req, res) => {
  const requests = await prisma.connectionRequest.findMany({
    where: { toUserId: req.userId, status: 'PENDING' },
    include: { fromUser: { include: userWithProfileInclude } },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    requests: requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      fromUser: formatUser(r.fromUser),
    })),
  })
})

async function respondToRequest(req, res, status) {
  const existing = await prisma.connectionRequest.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.toUserId !== req.userId) {
    return res.status(404).json({ error: 'Connection request not found' })
  }
  if (existing.status !== 'PENDING') {
    return res.status(409).json({ error: 'This request has already been responded to' })
  }

  const request = await prisma.connectionRequest.update({
    where: { id: existing.id },
    data: { status, respondedAt: new Date() },
  })

  res.json({ request })
}

router.put('/connections/requests/:id/accept', (req, res) => respondToRequest(req, res, 'ACCEPTED'))
router.put('/connections/requests/:id/decline', (req, res) => respondToRequest(req, res, 'DECLINED'))

router.get('/connections', async (req, res) => {
  const connections = await prisma.connectionRequest.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ fromUserId: req.userId }, { toUserId: req.userId }],
    },
    include: {
      fromUser: { include: userWithProfileInclude },
      toUser: { include: userWithProfileInclude },
    },
    orderBy: { respondedAt: 'desc' },
  })

  const users = connections.map((c) => (c.fromUserId === req.userId ? c.toUser : c.fromUser))
  res.json({ connections: users.map(formatUser) })
})

router.delete('/connections/:userId', async (req, res) => {
  const existing = await prisma.connectionRequest.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { fromUserId: req.userId, toUserId: req.params.userId },
        { fromUserId: req.params.userId, toUserId: req.userId },
      ],
    },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Connection not found' })
  }

  await prisma.connectionRequest.delete({ where: { id: existing.id } })
  res.status(204).end()
})

module.exports = router
