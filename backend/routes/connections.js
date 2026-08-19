const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { createNotification } = require('../lib/notifications')

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

  await createNotification({
    userId: targetId,
    type: 'CONNECTION_REQUEST',
    sourceUserId: req.userId,
    targetType: 'CONNECTION_REQUEST',
    targetId: request.id,
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

  const respondedAt = new Date()
  const request = await prisma.connectionRequest.update({
    where: { id: existing.id },
    data: { status, respondedAt },
  })

  if (status === 'ACCEPTED') {
    // A single row, actored by whoever sent the original request - not one
    // per participant. Two rows meant a third party connected to both people
    // saw the event twice (each row independently matches feed.js's "actor
    // is one of my connections" reach rule). One row still reaches both
    // participants: the accepter sees it via that same rule (they're now
    // connected to the actor), and the sender sees it via the dedicated
    // CONNECTION_MADE self-reach exception in feed.js. It also makes the
    // activity text unambiguous - see lib/activityFeed.js's counterpart
    // resolution, which reads consistently as "sender connected with
    // accepter" for every viewer once there's only one row to resolve from.
    await prisma.activity.create({
      data: { type: 'CONNECTION_MADE', actorUserId: existing.fromUserId, createdAt: respondedAt },
    })

    await createNotification({
      userId: existing.fromUserId,
      type: 'CONNECTION_ACCEPTED',
      sourceUserId: existing.toUserId,
      targetType: 'CONNECTION_REQUEST',
      targetId: existing.id,
    })
  }

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
