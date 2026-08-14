-- CreateEnum
CREATE TYPE "VenueVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "venueId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" TEXT,
    "state" TEXT,
    "country" TEXT,
    "venueType" TEXT,
    "verificationStatus" "VenueVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueSpecialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VenueSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VenueToVenueSpecialty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VenueToVenueSpecialty_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "VenueSpecialty_name_key" ON "VenueSpecialty"("name");

-- CreateIndex
CREATE INDEX "_VenueToVenueSpecialty_B_index" ON "_VenueToVenueSpecialty"("B");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueToVenueSpecialty" ADD CONSTRAINT "_VenueToVenueSpecialty_A_fkey" FOREIGN KEY ("A") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueToVenueSpecialty" ADD CONSTRAINT "_VenueToVenueSpecialty_B_fkey" FOREIGN KEY ("B") REFERENCES "VenueSpecialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: grant admin to the designated owner account
UPDATE "User" SET "isAdmin" = true WHERE "email" = 'ftmoncayo@gmail.com';

