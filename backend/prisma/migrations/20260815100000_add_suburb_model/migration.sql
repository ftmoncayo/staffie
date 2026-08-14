-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "suburbId" TEXT;

-- CreateTable
CREATE TABLE "Suburb" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "Suburb_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suburb_name_cityId_key" ON "Suburb"("name", "cityId");

-- AddForeignKey
ALTER TABLE "Suburb" ADD CONSTRAINT "Suburb_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_suburbId_fkey" FOREIGN KEY ("suburbId") REFERENCES "Suburb"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed starting cities (safe to re-run; skips any that already exist)
INSERT INTO "City" (id, name) VALUES
  (gen_random_uuid(), 'Melbourne'),
  (gen_random_uuid(), 'Sydney'),
  (gen_random_uuid(), 'London')
ON CONFLICT (name) DO NOTHING;
