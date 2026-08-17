-- Data backfill: seed the State records the three existing cities need, link each
-- city to its state, then flag (via NOTICE, without failing the migration) anything
-- that doesn't cleanly resolve: a city left without a state, or a free-text
-- Venue.state value that doesn't match one of the states seeded here. Both
-- Venue.state and Venue.country are dropped in the next migration once these
-- notices have been reviewed.

INSERT INTO "State" (id, name, "countryId")
SELECT gen_random_uuid(), 'Victoria', c.id FROM "Country" c WHERE c.name = 'Australia'
ON CONFLICT (name) DO NOTHING;

INSERT INTO "State" (id, name, "countryId")
SELECT gen_random_uuid(), 'New South Wales', c.id FROM "Country" c WHERE c.name = 'Australia'
ON CONFLICT (name) DO NOTHING;

INSERT INTO "State" (id, name, "countryId")
SELECT gen_random_uuid(), 'Greater London', c.id FROM "Country" c WHERE c.name = 'United Kingdom'
ON CONFLICT (name) DO NOTHING;

UPDATE "City" c
SET "stateId" = s.id
FROM "State" s
WHERE s.name = 'Victoria' AND c.name = 'Melbourne' AND c."stateId" IS NULL;

UPDATE "City" c
SET "stateId" = s.id
FROM "State" s
WHERE s.name = 'New South Wales' AND c.name = 'Sydney' AND c."stateId" IS NULL;

UPDATE "City" c
SET "stateId" = s.id
FROM "State" s
WHERE s.name = 'Greater London' AND c.name = 'London' AND c."stateId" IS NULL;

-- Flag any city this migration didn't anticipate and so couldn't assign a state to.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT name FROM "City" WHERE "stateId" IS NULL
  LOOP
    RAISE NOTICE 'City "%" has no matching State after backfill and needs manual assignment', rec.name;
  END LOOP;
END $$;

-- Flag any free-text Venue.state value that doesn't reasonably match a seeded
-- state by name or common abbreviation. Matching values need no further action:
-- venues carry their location via cityId/suburbId, not a direct stateId, so the
-- state hierarchy above already covers them once their city is linked.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT "state" AS state_value
    FROM "Venue"
    WHERE "state" IS NOT NULL
      AND lower(trim("state")) NOT IN (
        'victoria', 'vic',
        'new south wales', 'nsw',
        'greater london', 'london', 'england'
      )
  LOOP
    RAISE NOTICE 'Venue.state value "%" does not match a known State and will be discarded', rec.state_value;
  END LOOP;
END $$;
