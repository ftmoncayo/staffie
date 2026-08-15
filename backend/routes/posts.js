const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const postInclude = {
  authorUser: { include: { profile: { include: { city: true } } } },
  city: true,
}

function formatPost(post) {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    cityId: post.cityId,
    city: post.city,
    author: {
      id: post.authorUser.id,
      email: post.authorUser.email,
      profile: post.authorUser.profile
        ? {
            firstName: post.authorUser.profile.firstName,
            lastName: post.authorUser.profile.lastName,
            professionalTitle: post.authorUser.profile.professionalTitle,
            city: post.authorUser.profile.city,
          }
        : null,
    },
  }
}

router.get('/posts', async (req, res) => {
  const cityId = typeof req.query.cityId === 'string' ? req.query.cityId.trim() : ''

  const posts = await prisma.post.findMany({
    where: cityId ? { cityId } : undefined,
    include: postInclude,
    orderBy: { createdAt: 'desc' },
  })

  res.json({ posts: posts.map(formatPost) })
})

router.post('/posts', async (req, res) => {
  const { content } = req.body || {}

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Post content is required' })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: req.userId } })

  const post = await prisma.post.create({
    data: {
      authorUserId: req.userId,
      content: content.trim(),
      cityId: profile?.cityId || null,
    },
    include: postInclude,
  })

  res.status(201).json({ post: formatPost(post) })
})

router.delete('/posts/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.post.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Post not found' })
  }

  await prisma.post.delete({ where: { id: existing.id } })
  res.status(204).end()
})

module.exports = router
