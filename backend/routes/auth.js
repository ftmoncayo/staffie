const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { sendPasswordResetEmail } = require('../lib/mailer')

const router = express.Router()

const SALT_ROUNDS = 10
const TOKEN_EXPIRY = '7d'
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const GENERIC_FORGOT_PASSWORD_MESSAGE = {
  message: 'If an account with that email exists, a password reset link has been sent.',
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

async function computeManagerFlags(userId) {
  const [venueManager, businessManager] = await Promise.all([
    prisma.venueManager.findFirst({ where: { userId }, select: { id: true } }),
    prisma.businessManager.findFirst({ where: { userId }, select: { id: true } }),
  ])
  return { managesVenue: Boolean(venueManager), managesBusiness: Boolean(businessManager) }
}

router.post('/signup', async (req, res) => {
  const { email, password, inviteToken } = req.body || {}

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

  let inviteVenue = null
  if (typeof inviteToken === 'string' && inviteToken.trim()) {
    const invite = await prisma.invite.findUnique({ where: { token: inviteToken.trim() } })
    const valid =
      invite &&
      invite.status === 'PENDING' &&
      invite.expiresAt > new Date() &&
      invite.inviteeEmail === normalizedEmail

    if (valid) {
      await prisma.invite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } })
      await prisma.connectionRequest
        .create({ data: { fromUserId: invite.inviterUserId, toUserId: user.id } })
        .catch(() => {})
      if (invite.venueId) {
        inviteVenue = await prisma.venue.findUnique({
          where: { id: invite.venueId },
          select: { id: true, name: true },
        })
      }
    }
  }

  const token = signToken(user)
  const managerFlags = await computeManagerFlags(user.id)
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, isAdmin: user.isAdmin, isVenueAdmin: user.isVenueAdmin, ...managerFlags },
    inviteVenue,
  })
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

  if (user.isBlocked) {
    return res.status(403).json({ error: 'This account is temporarily blocked' })
  }

  const token = signToken(user)
  const managerFlags = await computeManagerFlags(user.id)
  res.json({
    token,
    user: { id: user.id, email: user.email, isAdmin: user.isAdmin, isVenueAdmin: user.isVenueAdmin, ...managerFlags },
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const managerFlags = await computeManagerFlags(user.id)
  res.json({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    isVenueAdmin: user.isVenueAdmin,
    createdAt: user.createdAt,
    ...managerFlags,
  })
})

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {}

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashResetToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`
    try {
      await sendPasswordResetEmail(user.email, resetUrl)
    } catch (err) {
      console.error('Failed to send password reset email:', err)
    }
  }

  res.json(GENERIC_FORGOT_PASSWORD_MESSAGE)
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {}

  if (typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Reset token is required' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const tokenHash = hashResetToken(token.trim())
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  const invalidMessage = { error: 'This password reset link is invalid or has expired' }
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return res.status(400).json(invalidMessage)
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
  ])

  res.json({ message: 'Your password has been reset. You can now log in.' })
})

module.exports = router
