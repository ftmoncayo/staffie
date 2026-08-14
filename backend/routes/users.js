const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

router.get('/users', requireAdmin, async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  const users = await prisma.user.findMany({
    where: search ? { email: { contains: search, mode: 'insensitive' } } : undefined,
    select: { id: true, email: true },
    orderBy: { email: 'asc' },
    take: 20,
  })

  res.json({ users })
})

module.exports = router
