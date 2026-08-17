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

// Maps each CONNECTION_REQUEST notification's targetId (a ConnectionRequest
// id) to that request's current status, so callers can tell which
// connection-request notifications are still actionable.
async function getConnectionRequestStatusMap(notifications) {
  const ids = [
    ...new Set(notifications.filter((n) => n.type === 'CONNECTION_REQUEST').map((n) => n.targetId)),
  ]
  if (ids.length === 0) return new Map()

  const requests = await prisma.connectionRequest.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  })
  return new Map(requests.map((r) => [r.id, r.status]))
}

function isPendingConnectionRequest(n, statusById) {
  return n.type === 'CONNECTION_REQUEST' && statusById.get(n.targetId) === 'PENDING'
}

// A CONNECTION_REQUEST notification stays visible only while the underlying
// request is still PENDING — once accepted or declined (from here or from
// /connections/requests directly) it stops appearing, without deleting the
// notification row itself. Every other type is unaffected.
async function filterVisibleNotifications(notifications) {
  const statusById = await getConnectionRequestStatusMap(notifications)
  return notifications.filter((n) => n.type !== 'CONNECTION_REQUEST' || isPendingConnectionRequest(n, statusById))
}

router.get('/notifications', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId, dismissed: false },
    include: { sourceUser: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: NOTIFICATION_LIMIT,
  })

  const visible = await filterVisibleNotifications(notifications)
  res.json({ notifications: visible.map(formatNotification) })
})

router.get('/notifications/unread-count', async (req, res) => {
  const unread = await prisma.notification.findMany({
    where: { userId: req.userId, read: false, dismissed: false },
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

router.put('/notifications/:id/dismiss', async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!notification || notification.userId !== req.userId) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  if (notification.type === 'CONNECTION_REQUEST') {
    const statusById = await getConnectionRequestStatusMap([notification])
    if (isPendingConnectionRequest(notification, statusById)) {
      return res.status(400).json({ error: 'Accept or decline this connection request instead of dismissing it' })
    }
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { dismissed: true },
  })

  res.json({ id: updated.id, dismissed: updated.dismissed })
})

router.put('/notifications/dismiss-all', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId, dismissed: false },
    select: { id: true, type: true, targetId: true },
  })

  const statusById = await getConnectionRequestStatusMap(notifications)
  const idsToDismiss = notifications
    .filter((n) => !isPendingConnectionRequest(n, statusById))
    .map((n) => n.id)

  if (idsToDismiss.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: idsToDismiss } },
      data: { dismissed: true },
    })
  }

  res.json({ ok: true, dismissedCount: idsToDismiss.length })
})

module.exports = router
