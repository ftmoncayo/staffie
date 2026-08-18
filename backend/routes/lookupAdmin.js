const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)
router.use(requireAdmin)

// --- Per-type reference counting and merge logic ---
//
// Every FK column pointing at these lookup tables defaults to ON DELETE
// RESTRICT (nothing here overrides it), so if a mergeRefs function below
// ever misses a reference, the final delete of the source row fails loudly
// with a foreign key error instead of silently corrupting data.

async function countSkillRefs(tx, id) {
  const [profileCount, jobSkillCount] = await Promise.all([
    tx.profile.count({ where: { skills: { some: { id } } } }),
    tx.jobSkill.count({ where: { skillId: id } }),
  ])
  return profileCount + jobSkillCount
}

async function mergeSkillRefs(tx, sourceId, targetId) {
  const profiles = await tx.profile.findMany({
    where: { skills: { some: { id: sourceId } } },
    select: { id: true },
  })
  for (const p of profiles) {
    await tx.profile.update({
      where: { id: p.id },
      data: { skills: { disconnect: { id: sourceId }, connect: { id: targetId } } },
    })
  }

  const jobSkills = await tx.jobSkill.findMany({ where: { skillId: sourceId } })
  for (const js of jobSkills) {
    const existing = await tx.jobSkill.findUnique({
      where: { jobId_skillId: { jobId: js.jobId, skillId: targetId } },
    })
    if (existing) {
      await tx.jobSkill.delete({ where: { id: js.id } })
    } else {
      await tx.jobSkill.update({ where: { id: js.id }, data: { skillId: targetId } })
    }
  }
}

async function countKnowledgeAreaRefs(tx, id) {
  const [profileCount, jobKnowledgeAreaCount] = await Promise.all([
    tx.profile.count({ where: { knowledgeAreas: { some: { id } } } }),
    tx.jobKnowledgeArea.count({ where: { knowledgeAreaId: id } }),
  ])
  return profileCount + jobKnowledgeAreaCount
}

async function mergeKnowledgeAreaRefs(tx, sourceId, targetId) {
  const profiles = await tx.profile.findMany({
    where: { knowledgeAreas: { some: { id: sourceId } } },
    select: { id: true },
  })
  for (const p of profiles) {
    await tx.profile.update({
      where: { id: p.id },
      data: { knowledgeAreas: { disconnect: { id: sourceId }, connect: { id: targetId } } },
    })
  }

  const rows = await tx.jobKnowledgeArea.findMany({ where: { knowledgeAreaId: sourceId } })
  for (const r of rows) {
    const existing = await tx.jobKnowledgeArea.findUnique({
      where: { jobId_knowledgeAreaId: { jobId: r.jobId, knowledgeAreaId: targetId } },
    })
    if (existing) {
      await tx.jobKnowledgeArea.delete({ where: { id: r.id } })
    } else {
      await tx.jobKnowledgeArea.update({ where: { id: r.id }, data: { knowledgeAreaId: targetId } })
    }
  }
}

async function countCertificationTypeRefs(tx, id) {
  return tx.certification.count({ where: { certificationTypeId: id } })
}

async function mergeCertificationTypeRefs(tx, sourceId, targetId) {
  await tx.certification.updateMany({ where: { certificationTypeId: sourceId }, data: { certificationTypeId: targetId } })
}

async function countVenueTypeRefs(tx, id) {
  return tx.venue.count({ where: { venueTypeId: id } })
}

async function mergeVenueTypeRefs(tx, sourceId, targetId) {
  await tx.venue.updateMany({ where: { venueTypeId: sourceId }, data: { venueTypeId: targetId } })
}

async function countVenueSpecialtyRefs(tx, id) {
  return tx.venue.count({ where: { specialties: { some: { id } } } })
}

async function mergeVenueSpecialtyRefs(tx, sourceId, targetId) {
  const venues = await tx.venue.findMany({
    where: { specialties: { some: { id: sourceId } } },
    select: { id: true },
  })
  for (const v of venues) {
    await tx.venue.update({
      where: { id: v.id },
      data: { specialties: { disconnect: { id: sourceId }, connect: { id: targetId } } },
    })
  }
}

async function countBusinessCategoryRefs(tx, id) {
  return tx.business.count({ where: { categoryId: id } })
}

async function mergeBusinessCategoryRefs(tx, sourceId, targetId) {
  await tx.business.updateMany({ where: { categoryId: sourceId }, data: { categoryId: targetId } })
}

async function countCountryRefs(tx, id) {
  const [stateCount, businessCount, profileCount] = await Promise.all([
    tx.state.count({ where: { countryId: id } }),
    tx.business.count({ where: { countryId: id } }),
    tx.profile.count({ where: { countryId: id } }),
  ])
  return stateCount + businessCount + profileCount
}

async function mergeCountryRefs(tx, sourceId, targetId) {
  await tx.state.updateMany({ where: { countryId: sourceId }, data: { countryId: targetId } })
  await tx.business.updateMany({ where: { countryId: sourceId }, data: { countryId: targetId } })
  await tx.profile.updateMany({ where: { countryId: sourceId }, data: { countryId: targetId } })
}

async function countStateRefs(tx, id) {
  const [cityCount, profileCount] = await Promise.all([
    tx.city.count({ where: { stateId: id } }),
    tx.profile.count({ where: { stateId: id } }),
  ])
  return cityCount + profileCount
}

async function mergeStateRefs(tx, sourceId, targetId) {
  // City.name is globally unique, so cities moving from source to target
  // state can never collide with an existing city there.
  await tx.city.updateMany({ where: { stateId: sourceId }, data: { stateId: targetId } })
  await tx.profile.updateMany({ where: { stateId: sourceId }, data: { stateId: targetId } })
}

async function getStateParent(tx, id) {
  const state = await tx.state.findUnique({ where: { id }, select: { countryId: true } })
  return state?.countryId ?? null
}

async function countCityRefs(tx, id) {
  const [profileCount, venueCount, postCount, businessLocationCount, suburbCount] = await Promise.all([
    tx.profile.count({ where: { cityId: id } }),
    tx.venue.count({ where: { cityId: id } }),
    tx.post.count({ where: { cityId: id } }),
    tx.businessLocation.count({ where: { cityId: id } }),
    tx.suburb.count({ where: { cityId: id } }),
  ])
  return profileCount + venueCount + postCount + businessLocationCount + suburbCount
}

async function mergeCityRefs(tx, sourceId, targetId) {
  await tx.profile.updateMany({ where: { cityId: sourceId }, data: { cityId: targetId } })
  await tx.venue.updateMany({ where: { cityId: sourceId }, data: { cityId: targetId } })
  await tx.post.updateMany({ where: { cityId: sourceId }, data: { cityId: targetId } })

  // BusinessLocation is unique on (businessId, cityId) - if a business
  // already has a location at the target city, drop the now-redundant
  // source-city row instead of repointing it into a collision.
  const businessLocations = await tx.businessLocation.findMany({ where: { cityId: sourceId } })
  for (const loc of businessLocations) {
    const existing = await tx.businessLocation.findUnique({
      where: { businessId_cityId: { businessId: loc.businessId, cityId: targetId } },
    })
    if (existing) {
      await tx.businessLocation.delete({ where: { id: loc.id } })
    } else {
      await tx.businessLocation.update({ where: { id: loc.id }, data: { cityId: targetId } })
    }
  }

  // Suburb is unique on (name, cityId) - if the target city already has a
  // suburb with the same name, cascade a full suburb-merge (repointing that
  // suburb's own references) instead of just repointing cityId.
  const suburbs = await tx.suburb.findMany({ where: { cityId: sourceId } })
  for (const suburb of suburbs) {
    const existing = await tx.suburb.findUnique({
      where: { name_cityId: { name: suburb.name, cityId: targetId } },
    })
    if (existing) {
      await mergeSuburbRefs(tx, suburb.id, existing.id)
      await tx.suburb.delete({ where: { id: suburb.id } })
    } else {
      await tx.suburb.update({ where: { id: suburb.id }, data: { cityId: targetId } })
    }
  }
}

async function getCityParent(tx, id) {
  const city = await tx.city.findUnique({ where: { id }, select: { stateId: true } })
  return city?.stateId ?? null
}

async function countSuburbRefs(tx, id) {
  const [profileCount, venueCount] = await Promise.all([
    tx.profile.count({ where: { suburbId: id } }),
    tx.venue.count({ where: { suburbId: id } }),
  ])
  return profileCount + venueCount
}

async function mergeSuburbRefs(tx, sourceId, targetId) {
  await tx.profile.updateMany({ where: { suburbId: sourceId }, data: { suburbId: targetId } })
  await tx.venue.updateMany({ where: { suburbId: sourceId }, data: { suburbId: targetId } })
}

async function getSuburbParent(tx, id) {
  const suburb = await tx.suburb.findUnique({ where: { id }, select: { cityId: true } })
  return suburb?.cityId ?? null
}

const LOOKUP_TYPES = {
  skill: {
    label: 'Skills',
    model: 'skill',
    countRefs: countSkillRefs,
    mergeRefs: mergeSkillRefs,
  },
  knowledgeArea: {
    label: 'Knowledge Areas',
    model: 'knowledgeArea',
    countRefs: countKnowledgeAreaRefs,
    mergeRefs: mergeKnowledgeAreaRefs,
  },
  certificationType: {
    label: 'Certification Types',
    model: 'certificationType',
    countRefs: countCertificationTypeRefs,
    mergeRefs: mergeCertificationTypeRefs,
  },
  venueType: {
    label: 'Venue Types',
    model: 'venueType',
    countRefs: countVenueTypeRefs,
    mergeRefs: mergeVenueTypeRefs,
  },
  venueSpecialty: {
    label: 'Venue Specialties',
    model: 'venueSpecialty',
    countRefs: countVenueSpecialtyRefs,
    mergeRefs: mergeVenueSpecialtyRefs,
  },
  businessCategory: {
    label: 'Business Categories',
    model: 'businessCategory',
    countRefs: countBusinessCategoryRefs,
    mergeRefs: mergeBusinessCategoryRefs,
  },
  country: {
    label: 'Countries',
    model: 'country',
    countRefs: countCountryRefs,
    mergeRefs: mergeCountryRefs,
  },
  state: {
    label: 'States',
    model: 'state',
    countRefs: countStateRefs,
    mergeRefs: mergeStateRefs,
    getParent: getStateParent,
    include: { country: true },
    formatEntry: (s) => ({ parentId: s.countryId, parentName: s.country.name }),
  },
  city: {
    label: 'Cities',
    model: 'city',
    countRefs: countCityRefs,
    mergeRefs: mergeCityRefs,
    getParent: getCityParent,
    include: { state: { include: { country: true } } },
    formatEntry: (c) => ({ parentId: c.stateId, parentName: `${c.state.name}, ${c.state.country.name}` }),
  },
  suburb: {
    label: 'Suburbs',
    model: 'suburb',
    countRefs: countSuburbRefs,
    mergeRefs: mergeSuburbRefs,
    getParent: getSuburbParent,
    include: { city: { include: { state: true } } },
    formatEntry: (s) => ({ parentId: s.cityId, parentName: `${s.city.name}, ${s.city.state.name}` }),
  },
}

function getConfig(req, res) {
  const config = LOOKUP_TYPES[req.params.type]
  if (!config) {
    res.status(404).json({ error: 'Unknown lookup type' })
    return null
  }
  return config
}

router.get('/lookup-types', (req, res) => {
  res.json({
    types: Object.entries(LOOKUP_TYPES).map(([key, c]) => ({ key, label: c.label })),
  })
})

router.get('/lookups/:type', async (req, res) => {
  const config = getConfig(req, res)
  if (!config) return

  const entries = await prisma[config.model].findMany({
    orderBy: { name: 'asc' },
    include: config.include,
  })

  const withCounts = await Promise.all(
    entries.map(async (entry) => ({
      id: entry.id,
      name: entry.name,
      referenceCount: await config.countRefs(prisma, entry.id),
      ...(config.formatEntry ? config.formatEntry(entry) : {}),
    })),
  )

  res.json({ entries: withCounts })
})

router.put('/lookups/:type/:id', async (req, res) => {
  const config = getConfig(req, res)
  if (!config) return

  const { name } = req.body || {}
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const existing = await prisma[config.model].findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ error: 'Entry not found' })
  }

  try {
    const updated = await prisma[config.model].update({
      where: { id: existing.id },
      data: { name: name.trim() },
    })
    res.json({ entry: updated })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An entry with this name already exists' })
    }
    throw err
  }
})

router.post('/lookups/:type/merge', async (req, res) => {
  const config = getConfig(req, res)
  if (!config) return

  const { sourceId, targetId } = req.body || {}
  if (typeof sourceId !== 'string' || !sourceId.trim() || typeof targetId !== 'string' || !targetId.trim()) {
    return res.status(400).json({ error: 'sourceId and targetId are required' })
  }
  if (sourceId === targetId) {
    return res.status(400).json({ error: 'Cannot merge an entry into itself' })
  }

  const [source, target] = await Promise.all([
    prisma[config.model].findUnique({ where: { id: sourceId } }),
    prisma[config.model].findUnique({ where: { id: targetId } }),
  ])
  if (!source || !target) {
    return res.status(404).json({ error: 'Source or target entry was not found' })
  }

  if (config.getParent) {
    const [sourceParent, targetParent] = await Promise.all([
      config.getParent(prisma, sourceId),
      config.getParent(prisma, targetId),
    ])
    if (sourceParent !== targetParent) {
      return res.status(400).json({
        error: 'These entries belong to different parents - merging them could produce inconsistent location data',
      })
    }
  }

  await prisma.$transaction(async (tx) => {
    await config.mergeRefs(tx, sourceId, targetId)
    await tx[config.model].delete({ where: { id: sourceId } })
  })

  res.json({ ok: true, mergedInto: target })
})

module.exports = router
