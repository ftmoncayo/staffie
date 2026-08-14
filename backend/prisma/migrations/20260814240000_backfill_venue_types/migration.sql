-- Data backfill: for each distinct existing Venue.venueType text value, find or create a
-- matching VenueType record (the four seeded values already cover common cases), then
-- link every matching Venue row to it via the new venueTypeId column. venueTypeId stays
-- nullable throughout — the original venueType text column was optional too — so there is
-- no NOT NULL constraint to fail here; the old column is simply dropped in the next migration
-- once these counts have been confirmed.

INSERT INTO "VenueType" (id, name)
SELECT gen_random_uuid(), sub.type_name
FROM (
  SELECT DISTINCT "venueType" AS type_name
  FROM "Venue"
  WHERE "venueType" IS NOT NULL AND "venueTypeId" IS NULL
) sub
ON CONFLICT (name) DO NOTHING;

UPDATE "Venue" v
SET "venueTypeId" = t.id
FROM "VenueType" t
WHERE t.name = v."venueType"
  AND v."venueTypeId" IS NULL;
