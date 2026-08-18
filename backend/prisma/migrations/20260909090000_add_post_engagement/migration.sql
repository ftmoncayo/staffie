-- AlterTable
-- Backfilled to each row's own createdAt (not a shared "now") so existing
-- rows don't all collapse onto the migration's execution time.
ALTER TABLE "Post" ADD COLUMN "lastEngagementAt" TIMESTAMP(3);
UPDATE "Post" SET "lastEngagementAt" = "createdAt";
ALTER TABLE "Post" ALTER COLUMN "lastEngagementAt" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "lastEngagementAt" SET DEFAULT CURRENT_TIMESTAMP;
