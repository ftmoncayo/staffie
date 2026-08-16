const crypto = require('crypto')
const prisma = require('./prisma')
const { displayName } = require('./displayName')
const { sendInviteEmail, sendManagerNudgeEmail } = require('./mailer')

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000

async function findOrCreateConnectionRequest(fromUserId, toUserId) {
  const existing = await prisma.connectionRequest.findFirst({
    where: {
      OR: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    },
  })
  if (existing) return { request: existing, created: false }

  const request = await prisma.connectionRequest.create({ data: { fromUserId, toUserId } })
  return { request, created: true }
}

// Shared by creation-time manager self-declaration and general worker invites.
// Existing GENERAL/VENUE_COWORKER invitees get a connection request instead of an
// email; existing VENUE_MANAGER_NUDGE invitees get an email pointing at the page
// itself (no signup needed); everyone else gets an Invite row + signup email.
async function sendInvite({ inviterUserId, inviteeEmail, type, venueId = null, businessId = null }) {
  const normalizedEmail = inviteeEmail.trim().toLowerCase()

  const inviter = await prisma.user.findUnique({
    where: { id: inviterUserId },
    include: { profile: true },
  })
  const inviterName = displayName(inviter)

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser && existingUser.id === inviterUserId) {
    throw new Error('You cannot invite yourself')
  }

  const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId } }) : null
  const business = businessId ? await prisma.business.findUnique({ where: { id: businessId } }) : null
  const targetName = venue?.name || business?.name || null

  if (existingUser && (type === 'GENERAL' || type === 'VENUE_COWORKER')) {
    const { created } = await findOrCreateConnectionRequest(inviterUserId, existingUser.id)
    return {
      kind: 'connection',
      message: created
        ? 'This person already has a Staffie account, so a connection request was sent instead of an email.'
        : 'This person already has a Staffie account and you already have a connection or pending request with them.',
    }
  }

  if (existingUser && type === 'VENUE_MANAGER_NUDGE') {
    const targetUrl = venue
      ? `${process.env.FRONTEND_URL}/venues/${venue.id}`
      : `${process.env.FRONTEND_URL}/businesses/${business.id}`
    await sendManagerNudgeEmail(normalizedEmail, { targetName, targetUrl })
    return { kind: 'nudge_email', message: 'This person already has a Staffie account. We emailed them a link to claim this page.' }
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const invite = await prisma.invite.create({
    data: {
      inviterUserId,
      inviteeEmail: normalizedEmail,
      venueId: venue?.id || null,
      businessId: business?.id || null,
      type,
      token: rawToken,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  })

  const signupUrl = `${process.env.FRONTEND_URL}/signup?invite=${rawToken}`
  await sendInviteEmail(normalizedEmail, { type, inviterName, targetName, signupUrl })

  return { kind: 'invite_sent', message: 'An invite email was sent.', invite }
}

module.exports = { sendInvite, findOrCreateConnectionRequest, INVITE_TTL_MS }
