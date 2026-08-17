-- Data backfill: ensure an "Other" VenueType exists (creating it if needed), then
-- point every venue that has no type at it. venueTypeId is made required in the
-- next migration once this has run.

INSERT INTO "VenueType" (id, name)
VALUES (gen_random_uuid(), 'Other')
ON CONFLICT (name) DO NOTHING;

UPDATE "Venue" v
SET "venueTypeId" = t.id
FROM "VenueType" t
WHERE t.name = 'Other'
  AND v."venueTypeId" IS NULL;
