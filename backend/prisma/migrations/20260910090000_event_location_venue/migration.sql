-- AlterTable
ALTER TABLE "Event" ADD COLUMN "locationVenueId" TEXT;

-- Backfill: VENUE-owned events default their location to the owning venue
-- itself. BUSINESS-owned events have no single fixed location, so they're
-- left unset (NULL) unless the creator explicitly picked one via the old
-- country/state/city/suburb fields, which had no venue equivalent to map to
-- and are being dropped below anyway.
UPDATE "Event" SET "locationVenueId" = "ownerId" WHERE "ownerType" = 'VENUE';

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationVenueId_fkey" FOREIGN KEY ("locationVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_countryId_fkey";
ALTER TABLE "Event" DROP CONSTRAINT "Event_stateId_fkey";
ALTER TABLE "Event" DROP CONSTRAINT "Event_cityId_fkey";
ALTER TABLE "Event" DROP CONSTRAINT "Event_suburbId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "countryId";
ALTER TABLE "Event" DROP COLUMN "stateId";
ALTER TABLE "Event" DROP COLUMN "cityId";
ALTER TABLE "Event" DROP COLUMN "suburbId";
