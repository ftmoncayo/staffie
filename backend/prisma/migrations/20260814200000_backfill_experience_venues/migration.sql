-- Data backfill: create a Venue for each distinct existing Experience.venueName value,
-- attributed to the user who owns the earliest Experience row referencing that name,
-- then link every matching Experience row to it via the new venueId column.
-- venueId is still nullable at this point; it is made required and venueName is
-- dropped in a later migration, after the row counts here have been confirmed.

INSERT INTO "Venue" (id, name, "verificationStatus", "createdByUserId", "createdAt")
SELECT gen_random_uuid(), sub.venue_name, 'UNVERIFIED', sub.user_id, now()
FROM (
  SELECT DISTINCT ON (e."venueName")
    e."venueName" AS venue_name,
    p."userId" AS user_id
  FROM "Experience" e
  JOIN "Profile" p ON p.id = e."profileId"
  WHERE e."venueId" IS NULL
  ORDER BY e."venueName", e."startDate" ASC, e.id ASC
) sub;

UPDATE "Experience" e
SET "venueId" = v.id
FROM "Venue" v
WHERE v.name = e."venueName"
  AND e."venueId" IS NULL;
