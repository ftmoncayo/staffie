-- CreateTable
CREATE TABLE "VenueManager" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VenueManager_venueId_userId_key" ON "VenueManager"("venueId", "userId");

-- AddForeignKey
ALTER TABLE "VenueManager" ADD CONSTRAINT "VenueManager_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueManager" ADD CONSTRAINT "VenueManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueManager" ADD CONSTRAINT "VenueManager_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

