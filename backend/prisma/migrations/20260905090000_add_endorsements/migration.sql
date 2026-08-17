-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ENDORSEMENT_REQUEST';

-- AlterEnum
ALTER TYPE "NotificationTargetType" ADD VALUE 'SKILL';
ALTER TYPE "NotificationTargetType" ADD VALUE 'KNOWLEDGE_AREA';

-- CreateEnum
CREATE TYPE "EndorsementItemType" AS ENUM ('SKILL', 'KNOWLEDGE_AREA');

-- CreateEnum
CREATE TYPE "EndorsementRole" AS ENUM ('PEER', 'MANAGER');

-- CreateTable
CREATE TABLE "Endorsement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "itemType" "EndorsementItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "endorserUserId" TEXT NOT NULL,
    "endorserRole" "EndorsementRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_profileId_itemType_itemId_endorserUserId_key" ON "Endorsement"("profileId", "itemType", "itemId", "endorserUserId");

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_endorserUserId_fkey" FOREIGN KEY ("endorserUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
