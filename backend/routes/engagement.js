const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { displayName } = require('../lib/displayName')

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
  return Boolean(await prisma.activity.findUnique({ where: { id: targetId } }))
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

  const [comments, nodCount, myNod] = await Promise.all([
    prisma.comment.findMany({
      where: target,
      include: { authorUser: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.nod.count({ where: target }),
    prisma.nod.findUnique({
      where: { targetType_targetId_userId: { ...target, userId: req.userId } },
    }),
  ])

  res.json({
    comments: comments.map(formatComment),
    nodCount,
    nodded: Boolean(myNod),
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

  const comment = await prisma.comment.create({
    data: { ...target, authorUserId: req.userId, content: content.trim() },
    include: { authorUser: { include: { profile: true } } },
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

  if (!(await targetExists(target.targetType, target.targetId))) {
    return res.status(404).json({ error: 'Nothing found to nod at' })
  }

  const where = { targetType_targetId_userId: { ...target, userId: req.userId } }
  const existing = await prisma.nod.findUnique({ where })

  if (existing) {
    await prisma.nod.delete({ where })
  } else {
    await prisma.nod.create({ data: { ...target, userId: req.userId } })
  }

  const nodCount = await prisma.nod.count({ where: target })
  res.json({ nodded: !existing, nodCount })
})

module.exports = router
