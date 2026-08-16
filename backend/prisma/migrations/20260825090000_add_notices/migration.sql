-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'NOTICE_POSTED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "noticeId" TEXT;

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "targetType" "ManagerTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_noticeId_key" ON "Activity"("noticeId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

