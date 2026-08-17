-- AlterTable
ALTER TABLE "City" ALTER COLUMN "stateId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "City" DROP CONSTRAINT "City_countryId_fkey";

-- AlterTable
ALTER TABLE "City" DROP COLUMN "countryId";

-- AlterTable
ALTER TABLE "Venue" DROP COLUMN "state";
ALTER TABLE "Venue" DROP COLUMN "country";
