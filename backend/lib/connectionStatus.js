const prisma = require('./prisma')

async function buildConnectionStatusMap(userId) {
  const requests = await prisma.connectionRequest.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
  })

  const statusByUserId = new Map()
  for (const r of requests) {
    const otherId = r.fromUserId === userId ? r.toUserId : r.fromUserId
    if (r.status === 'ACCEPTED') {
      statusByUserId.set(otherId, { status: 'connected' })
    } else if (r.status === 'PENDING') {
      statusByUserId.set(otherId, {
        status: r.fromUserId === userId ? 'pending-sent' : 'pending-received',
        requestId: r.id,
      })
    }
  }
  return statusByUserId
}

function connectionStatusFor(statusByUserId, otherUserId) {
  const entry = statusByUserId.get(otherUserId)
  return {
    connectionStatus: entry?.status || 'none',
    connectionRequestId: entry?.requestId || null,
  }
}

module.exports = { buildConnectionStatusMap, connectionStatusFor }
