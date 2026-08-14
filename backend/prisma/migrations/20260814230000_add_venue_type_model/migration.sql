-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "venueTypeId" TEXT;

-- CreateTable
CREATE TABLE "VenueType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VenueType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VenueType_name_key" ON "VenueType"("name");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_venueTypeId_fkey" FOREIGN KEY ("venueTypeId") REFERENCES "VenueType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed starting venue types
INSERT INTO "VenueType" (id, name) VALUES
  (gen_random_uuid(), 'Bar'),
  (gen_random_uuid(), 'Pub'),
  (gen_random_uuid(), 'Restaurant'),
  (gen_random_uuid(), 'Brewery')
ON CONFLICT (name) DO NOTHING;

