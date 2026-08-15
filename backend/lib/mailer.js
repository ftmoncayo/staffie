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

module.exports = { sendPasswordResetEmail }
