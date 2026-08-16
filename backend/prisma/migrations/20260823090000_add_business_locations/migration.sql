-- CreateEnum
CREATE TYPE "BusinessLocationScope" AS ENUM ('SPECIFIC_CITIES', 'COUNTRY', 'GLOBAL');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- Seed starting countries (safe to re-run; skips any that already exist)
INSERT INTO "Country" (id, name) VALUES
  (gen_random_uuid(), 'Australia'),
  (gen_random_uuid(), 'United Kingdom')
ON CONFLICT (name) DO NOTHING;

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "City" ADD COLUMN     "countryId" TEXT;

-- Backfill existing cities to their country
UPDATE "City" SET "countryId" = (SELECT id FROM "Country" WHERE name = 'Australia') WHERE name IN ('Melbourne', 'Sydney');
UPDATE "City" SET "countryId" = (SELECT id FROM "Country" WHERE name = 'United Kingdom') WHERE name = 'London';

-- AlterTable (now enforce NOT NULL now that every row has a value)
ALTER TABLE "City" ALTER COLUMN "countryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "locationScope" "BusinessLocationScope" NOT NULL DEFAULT 'SPECIFIC_CITIES';

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BusinessLocation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_businessId_cityId_key" ON "BusinessLocation"("businessId", "cityId");

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
