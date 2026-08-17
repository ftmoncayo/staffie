const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { displayName } = require('../lib/displayName')

const router = express.Router()
router.use(requireAuth)

const NOTIFICATION_LIMIT = 50

function formatNotification(n) {
  return {
    id: n.id,
    type: n.type,
    targetType: n.targetType,
    targetId: n.targetId,
    read: n.read,
    createdAt: n.createdAt,
    sourceUser: n.sourceUser ? { id: n.sourceUser.id, name: displayName(n.sourceUser) } : null,
  }
}

// A CONNECTION_REQUEST notification stays visible only while the underlying
// request is still PENDING — once accepted or declined (from here or from
// /connections/requests directly) it stops appearing, without deleting the
// notification row itself. Every other type is unaffected.
async function filterVisibleNotifications(notifications) {
  const connectionRequestIds = [
    ...new Set(notifications.filter((n) => n.type === 'CONNECTION_REQUEST').map((n) => n.targetId)),
  ]
  if (connectionRequestIds.length === 0) return notifications

  const requests = await prisma.connectionRequest.findMany({
    where: { id: { in: connectionRequestIds } },
    select: { id: true, status: true },
  })
  const statusById = new Map(requests.map((r) => [r.id, r.status]))

  return notifications.filter(
    (n) => n.type !== 'CONNECTION_REQUEST' || statusById.get(n.targetId) === 'PENDING',
  )
}

router.get('/notifications', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    include: { sourceUser: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: NOTIFICATION_LIMIT,
  })

  const visible = await filterVisibleNotifications(notifications)
  res.json({ notifications: visible.map(formatNotification) })
})

router.get('/notifications/unread-count', async (req, res) => {
  const unread = await prisma.notification.findMany({
    where: { userId: req.userId, read: false },
    select: { id: true, type: true, targetId: true },
  })
  const visible = await filterVisibleNotifications(unread)
  res.json({ count: visible.length })
})

router.put('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, read: false },
    data: { read: true },
  })
  res.json({ ok: true })
})

router.put('/notifications/:id/read', async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!notification || notification.userId !== req.userId) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { read: true },
  })

  res.json({ id: updated.id, read: updated.read })
})

module.exports = router
