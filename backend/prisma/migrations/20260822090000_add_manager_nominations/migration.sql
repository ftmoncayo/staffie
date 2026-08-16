-- CreateEnum
CREATE TYPE "ManagerTargetType" AS ENUM ('VENUE', 'BUSINESS');

-- CreateEnum
CREATE TYPE "NominationStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "ManagerNomination" (
    "id" TEXT NOT NULL,
    "targetType" "ManagerTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "nomineeUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NominationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedByUserId" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ManagerNomination_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManagerNomination" ADD CONSTRAINT "ManagerNomination_nomineeUserId_fkey" FOREIGN KEY ("nomineeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNomination" ADD CONSTRAINT "ManagerNomination_respondedByUserId_fkey" FOREIGN KEY ("respondedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

