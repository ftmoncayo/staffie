-- AlterTable: optional Profile -> Suburb location refinement, mirroring Venue.suburbId.
ALTER TABLE "Profile" ADD COLUMN "suburbId" TEXT;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_suburbId_fkey" FOREIGN KEY ("suburbId") REFERENCES "Suburb"("id") ON DELETE SET NULL ON UPDATE CASCADE;
