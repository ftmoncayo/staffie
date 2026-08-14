const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const SALT_ROUNDS = 10
const TOKEN_EXPIRY = '7d'

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash },
  })

  const token = signToken(user)
  res.status(201).json({ token, user: { id: user.id, email: user.email } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  const invalidMessage = { error: 'Invalid email or password' }
  if (!user) {
    return res.status(401).json(invalidMessage)
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    return res.status(401).json(invalidMessage)
  }

  const token = signToken(user)
  res.json({ token, user: { id: user.id, email: user.email } })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({ id: user.id, email: user.email, createdAt: user.createdAt })
})

module.exports = router
