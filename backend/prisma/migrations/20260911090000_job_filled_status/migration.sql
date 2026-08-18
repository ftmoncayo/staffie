-- CreateEnum
CREATE TYPE "JobFilledStatus" AS ENUM ('FILLED', 'NOT_FILLED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "filledStatus" "JobFilledStatus";
ALTER TABLE "Job" ADD COLUMN "hiredApplicantUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_hiredApplicantUserId_fkey" FOREIGN KEY ("hiredApplicantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
