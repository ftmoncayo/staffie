const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { displayName } = require('../lib/displayName')
const { buildConnectionStatusMap } = require('../lib/connectionStatus')
const { createNotification } = require('../lib/notifications')

const router = express.Router()
router.use(requireAuth)

const TARGET_TYPES = ['POST', 'ACTIVITY']

function parseTarget(query) {
  const targetType = query.targetType
  const targetId = typeof query.targetId === 'string' ? query.targetId.trim() : ''
  if (!TARGET_TYPES.includes(targetType) || !targetId) return null
  return { targetType, targetId }
}

async function targetExists(targetType, targetId) {
  if (targetType === 'POST') {
    return Boolean(await prisma.post.findUnique({ where: { id: targetId } }))
  }
  // PROFILE_UPDATED is no longer emitted and excluded from every feed/activity
  // query, but defensively reject it here too in case an old row (or its id)
  // is hit directly — treated the same as "doesn't exist".
  const activity = await prisma.activity.findUnique({ where: { id: targetId }, select: { type: true } })
  return Boolean(activity) && activity.type !== 'PROFILE_UPDATED'
}

// Engaging (nodding/commenting) with someone else's Activity requires an
// accepted connection to that activity's actor; Posts remain unrestricted.
async function canEngageWithActivity(userId, activityId) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { actorUserId: true },
  })
  if (!activity?.actorUserId) return false
  if (activity.actorUserId === userId) return true

  const statusMap = await buildConnectionStatusMap(userId)
  return statusMap.get(activity.actorUserId)?.status === 'connected'
}

async function canEngageWithTarget(userId, target) {
  if (target.targetType !== 'ACTIVITY') return true
  return canEngageWithActivity(userId, target.targetId)
}

// Who "owns" a target for notification purposes: a Post's author, or an
// Activity's actor. Activities without an actor (shouldn't happen in
// practice) simply don't notify anyone.
async function getTargetOwnerUserId(targetType, targetId) {
  if (targetType === 'POST') {
    const post = await prisma.post.findUnique({ where: { id: targetId }, select: { authorUserId: true } })
    return post?.authorUserId || null
  }
  const activity = await prisma.activity.findUnique({ where: { id: targetId }, select: { actorUserId: true } })
  return activity?.actorUserId || null
}

function formatComment(comment) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: {
      id: comment.authorUser.id,
      email: comment.authorUser.email,
      profile: comment.authorUser.profile
        ? {
            firstName: comment.authorUser.profile.firstName,
            lastName: comment.authorUser.profile.lastName,
          }
        : null,
      name: displayName(comment.authorUser),
    },
  }
}

router.get('/engagement', async (req, res) => {
  const target = parseTarget(req.query)
  if (!target) {
    return res.status(400).json({ error: 'A valid targetType and targetId are required' })
  }

  const [comments, nodCount, myNod, canEngage] = await Promise.all([
    prisma.comment.findMany({
      where: target,
      include: { authorUser: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.nod.count({ where: target }),
    prisma.nod.findUnique({
      where: { targetType_targetId_userId: { ...target, userId: req.userId } },
    }),
    canEngageWithTarget(req.userId, target),
  ])

  res.json({
    comments: comments.map(formatComment),
    nodCount,
    nodded: Boolean(myNod),
    canEngage,
  })
})

router.post('/comments', async (req, res) => {
  const { targetType, targetId, content } = req.body || {}
  const target = parseTarget({ targetType, targetId })
  if (!target) {
    return res.status(400).json({ error: 'A valid targetType and targetId are required' })
  }
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' })
  }

  if (!(await targetExists(target.targetType, target.targetId))) {
    return res.status(404).json({ error: 'Nothing found to comment on' })
  }
  if (!(await canEngageWithTarget(req.userId, target))) {
    return res.status(403).json({ error: 'Connect with this person to comment on their activity' })
  }

  const comment = await prisma.comment.create({
    data: { ...target, authorUserId: req.userId, content: content.trim() },
    include: { authorUser: { include: { profile: true } } },
  })

  // Scoped to NOTICE_POSTED only: fresh engagement bumps the notice back
  // toward the top of the feed instead of it staying pinned to its original
  // post time (see lib/activityFeed.js's effectiveDate).
  if (target.targetType === 'ACTIVITY') {
    const activity = await prisma.activity.findUnique({ where: { id: target.targetId }, select: { type: true } })
    if (activity?.type === 'NOTICE_POSTED') {
      await prisma.activity.update({ where: { id: target.targetId }, data: { lastEngagementAt: new Date() } })
    }
  }

  const ownerUserId = await getTargetOwnerUserId(target.targetType, target.targetId)
  await createNotification({
    userId: ownerUserId,
    type: 'COMMENT',
    sourceUserId: req.userId,
    targetType: target.targetType,
    targetId: target.targetId,
  })

  res.status(201).json({ comment: formatComment(comment) })
})

router.delete('/comments/:id', async (req, res) => {
  const existing = await prisma.comment.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Comment not found' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (existing.authorUserId !== req.userId && !user?.isAdmin) {
    return res.status(403).json({ error: 'You do not have permission to delete this comment' })
  }

  await prisma.comment.delete({ where: { id: existing.id } })
  res.status(204).end()
})

router.post('/nods/toggle', async (req, res) => {
  const { targetType, targetId } = req.body || {}
  const target = parseTarget({ targetType, targetId })
  if (!target) {
    return res.status(400).json({ error: 'A valid targetType and targetId are required' })
  }
  // Nodding is retired for activity items — the control is hidden client-side,
  // this rejects anyone hitting the endpoint directly. Existing Nod rows and
  // the model itself are untouched in case this comes back.
  if (target.targetType === 'ACTIVITY') {
    return res.status(400).json({ error: 'Nodding is no longer available for activity items' })
  }

  if (!(await targetExists(target.targetType, target.targetId))) {
    return res.status(404).json({ error: 'Nothing found to nod at' })
  }
  if (!(await canEngageWithTarget(req.userId, target))) {
    return res.status(403).json({ error: 'Connect with this person to nod at their activity' })
  }

  const where = { targetType_targetId_userId: { ...target, userId: req.userId } }
  const existing = await prisma.nod.findUnique({ where })

  if (existing) {
    await prisma.nod.delete({ where })
  } else {
    await prisma.nod.create({ data: { ...target, userId: req.userId } })

    const ownerUserId = await getTargetOwnerUserId(target.targetType, target.targetId)
    await createNotification({
      userId: ownerUserId,
      type: 'NOD',
      sourceUserId: req.userId,
      targetType: target.targetType,
      targetId: target.targetId,
    })
  }

  const nodCount = await prisma.nod.count({ where: target })
  res.json({ nodded: !existing, nodCount })
})

module.exports = router
