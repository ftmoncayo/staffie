const { Resend } = require('resend')

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const resend = getClient()
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: toEmail,
    subject: 'Reset your Staffie password',
    html: `
      <p>We received a request to reset your Staffie password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  })
}

const INVITE_COPY = {
  GENERAL: ({ inviterName }) => ({
    subject: `${inviterName} invites you to join Staffie`,
    body: `<p>${inviterName} invites you to join Staffie.</p>`,
  }),
  VENUE_COWORKER: ({ inviterName, targetName }) => ({
    subject: `${inviterName} says you work with them at ${targetName}`,
    body: `<p>${inviterName} says you work with them at ${targetName}. Sign up to connect.</p>`,
  }),
  VENUE_MANAGER_NUDGE: ({ targetName }) => ({
    subject: `Claim ${targetName} on Staffie`,
    body: `<p>Someone added ${targetName} on Staffie and thinks you might manage it. Sign up and claim this page.</p>`,
  }),
}

async function sendInviteEmail(toEmail, { type, inviterName, targetName, signupUrl }) {
  const resend = getClient()
  const buildCopy = INVITE_COPY[type] || INVITE_COPY.GENERAL
  const { subject, body } = buildCopy({ inviterName, targetName })
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: toEmail,
    subject,
    html: `
      ${body}
      <p><a href="${signupUrl}">Sign up for Staffie</a></p>
      <p>This invite expires in 30 days.</p>
    `,
  })
}

async function sendManagerNudgeEmail(toEmail, { targetName, targetUrl }) {
  const resend = getClient()
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: toEmail,
    subject: `Claim ${targetName} on Staffie`,
    html: `
      <p>Someone added ${targetName} on Staffie and thinks you might manage it.</p>
      <p><a href="${targetUrl}">Visit the page</a> and use "Request to manage this" to claim it.</p>
    `,
  })
}

module.exports = { sendPasswordResetEmail, sendInviteEmail, sendManagerNudgeEmail }
