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

// Every userId this user has an ACCEPTED connection with — used to gate
// eligibility (e.g. endorsements) on being connected, not just meeting the
// underlying colleague/manager criteria.
async function getAcceptedConnectionUserIds(userId) {
  const accepted = await prisma.connectionRequest.findMany({
    where: { status: 'ACCEPTED', OR: [{ fromUserId: userId }, { toUserId: userId }] },
    select: { fromUserId: true, toUserId: true },
  })
  return new Set(accepted.map((r) => (r.fromUserId === userId ? r.toUserId : r.fromUserId)))
}

async function buildConnectionsAdjacency() {
  const accepted = await prisma.connectionRequest.findMany({ where: { status: 'ACCEPTED' } })

  const adjacency = new Map()
  function link(a, b) {
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    adjacency.get(a).add(b)
  }
  for (const r of accepted) {
    link(r.fromUserId, r.toUserId)
    link(r.toUserId, r.fromUserId)
  }
  return adjacency
}

module.exports = {
  buildConnectionStatusMap,
  connectionStatusFor,
  getAcceptedConnectionUserIds,
  buildConnectionsAdjacency,
}
