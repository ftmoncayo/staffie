-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('SIGNUP', 'CONNECTION_MADE', 'EXPERIENCE_ADDED', 'CERTIFICATION_ADDED', 'PROFILE_UPDATED', 'VENUE_CREATED', 'BUSINESS_CREATED', 'NOTICE_POSTED');
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

