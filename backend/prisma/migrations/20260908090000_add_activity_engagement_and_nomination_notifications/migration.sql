-- AlterTable
-- Backfilled to each row's own createdAt (not a shared "now") so existing
-- rows don't all collapse onto the migration's execution time.
ALTER TABLE "Activity" ADD COLUMN "lastEngagementAt" TIMESTAMP(3);
UPDATE "Activity" SET "lastEngagementAt" = "createdAt";
ALTER TABLE "Activity" ALTER COLUMN "lastEngagementAt" SET NOT NULL;
ALTER TABLE "Activity" ALTER COLUMN "lastEngagementAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MANAGER_NOMINATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'MANAGER_NOMINATION_DECLINED';

-- AlterEnum
ALTER TYPE "NotificationTargetType" ADD VALUE 'VENUE';
ALTER TYPE "NotificationTargetType" ADD VALUE 'BUSINESS';
