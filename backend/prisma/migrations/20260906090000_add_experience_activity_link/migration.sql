-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "experienceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_experienceId_key" ON "Activity"("experienceId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
