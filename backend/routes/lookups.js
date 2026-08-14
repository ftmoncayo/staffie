const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const SEARCH_LIMIT = 20

function searchFilter(search) {
  return search ? { name: { contains: search, mode: 'insensitive' } } : undefined
}

function getSearch(req) {
  return typeof req.query.search === 'string' ? req.query.search.trim() : ''
}

function validateName(req, res) {
  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' })
    return null
  }
  return name.trim()
}

// --- Cities ---

router.get('/cities', async (req, res) => {
  const cities = await prisma.city.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ cities })
})

router.post('/cities', async (req, res) => {
  const name = validateName(req, res)
  if (!name) return

  const city = await prisma.city.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json({ city })
})

// --- Skills ---

router.get('/skills', async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ skills })
})

// --- Certification types ---

router.get('/certification-types', async (req, res) => {
  const certificationTypes = await prisma.certificationType.findMany({
    where: searchFilter(getSearch(req)),
    orderBy: { name: 'asc' },
    take: SEARCH_LIMIT,
  })
  res.json({ certificationTypes })
})

router.post('/certification-types', async (req, res) => {
  const name = validateName(req, res)
  if (!name) return

  const certificationType = await prisma.certificationType.upsert({
    where: { name },
    create: { name },
    update: {},
  })
  res.status(201).json({ certificationType })
})

module.exports = router
