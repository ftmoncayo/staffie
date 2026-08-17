-- AlterTable
ALTER TABLE "Venue" ALTER COLUMN "venueTypeId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Venue" DROP CONSTRAINT "Venue_venueTypeId_fkey";

-- AddForeignKey: now required, so ON DELETE SET NULL (valid only for nullable
-- columns) becomes ON DELETE RESTRICT.
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_venueTypeId_fkey" FOREIGN KEY ("venueTypeId") REFERENCES "VenueType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
