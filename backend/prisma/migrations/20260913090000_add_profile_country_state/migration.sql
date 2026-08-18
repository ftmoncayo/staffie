-- AlterTable: optional Profile -> Country/State fields, so a person can record
-- a coarser-than-city location. At most one of countryId/stateId/cityId/suburbId
-- is ever populated for a given profile - see resolveLocationScope in lib/location.js.
ALTER TABLE "Profile" ADD COLUMN "countryId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "stateId" TEXT;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;
