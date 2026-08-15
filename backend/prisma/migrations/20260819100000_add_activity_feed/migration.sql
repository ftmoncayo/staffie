-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CONNECTION_MADE', 'EXPERIENCE_ADDED', 'CERTIFICATION_ADDED', 'PROFILE_UPDATED', 'VENUE_VERIFIED', 'BUSINESS_VERIFIED');

-- AlterTable
ALTER TABLE "BusinessFollow" ADD COLUMN     "isFavourite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VenueFollow" ADD COLUMN     "isFavourite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "actorUserId" TEXT,
    "venueId" TEXT,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

