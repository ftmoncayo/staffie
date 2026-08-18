const prisma = require('./prisma')
const { canEditVenue, getVerifiedManagers } = require('../routes/venues')
const { canEditBusiness } = require('../routes/businesses')

// An event's create/edit permission always follows its owner entity's own
// edit permission — a venue-owned event follows canEditVenue, a
// business-owned event follows canEditBusiness. No separate event-level
// permission model.
async function canEditEventOwner(userId, ownerType, ownerId) {
  if (ownerType === 'VENUE') return canEditVenue(userId, ownerId)
  if (ownerType === 'BUSINESS') return canEditBusiness(userId, ownerId)
  return false
}

// Recipients for the EVENT_INTEREST notification fan-out: the owner venue's
// verified managers, or (businesses have no equivalent helper yet) the
// business's verified managers fetched directly here.
async function getEventOwnerManagers(ownerType, ownerId) {
  if (ownerType === 'VENUE') return getVerifiedManagers(ownerId)
  const rows = await prisma.businessManager.findMany({
    where: { businessId: ownerId, verified: true },
    select: { userId: true },
  })
  return rows.map((m) => ({ id: m.userId }))
}

async function ownerExists(ownerType, ownerId) {
  if (ownerType === 'VENUE') return Boolean(await prisma.venue.findUnique({ where: { id: ownerId } }))
  if (ownerType === 'BUSINESS') return Boolean(await prisma.business.findUnique({ where: { id: ownerId } }))
  return false
}

module.exports = { canEditEventOwner, getEventOwnerManagers, ownerExists }
