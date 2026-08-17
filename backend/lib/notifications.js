const prisma = require('./prisma')

// Creates a Notification for userId, unless userId is missing or is the same
// as sourceUserId — the single place that enforces "never notify on your own
// actions" so every call site doesn't have to remember to check.
async function createNotification({ userId, type, sourceUserId, targetType, targetId }) {
  if (!userId || userId === sourceUserId) return null
  return prisma.notification.create({
    data: { userId, type, sourceUserId, targetType, targetId },
  })
}

module.exports = { createNotification }
