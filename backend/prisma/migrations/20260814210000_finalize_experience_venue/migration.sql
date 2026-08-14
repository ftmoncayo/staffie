-- DropForeignKey
ALTER TABLE "Experience" DROP CONSTRAINT "Experience_venueId_fkey";

-- AlterTable
ALTER TABLE "Experience" DROP COLUMN "venueName",
ALTER COLUMN "venueId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

