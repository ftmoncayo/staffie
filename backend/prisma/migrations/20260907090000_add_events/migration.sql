-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_INTEREST';
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_CONFIRM';

-- AlterEnum
ALTER TYPE "NotificationTargetType" ADD VALUE 'EVENT';

-- CreateEnum
CREATE TYPE "EventInterestStatus" AS ENUM ('INTERESTED', 'ATTENDED', 'DID_NOT_ATTEND');

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "ownerType" "ManagerTargetType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "countryId" TEXT,
    "stateId" TEXT,
    "cityId" TEXT,
    "suburbId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSkill" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "EventSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventKnowledgeArea" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "knowledgeAreaId" TEXT NOT NULL,

    CONSTRAINT "EventKnowledgeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "status" "EventInterestStatus" NOT NULL DEFAULT 'INTERESTED',
    "askedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upskilling" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "itemType" "EndorsementItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upskilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_name_key" ON "EventCategory"("name");

-- CreateIndex
CREATE INDEX "Event_ownerType_ownerId_idx" ON "Event"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSkill_eventId_skillId_key" ON "EventSkill"("eventId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "EventKnowledgeArea_eventId_knowledgeAreaId_key" ON "EventKnowledgeArea"("eventId", "knowledgeAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInterest_eventId_userId_key" ON "EventInterest"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Upskilling_profileId_itemType_itemId_key" ON "Upskilling"("profileId", "itemType", "itemId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_suburbId_fkey" FOREIGN KEY ("suburbId") REFERENCES "Suburb"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSkill" ADD CONSTRAINT "EventSkill_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSkill" ADD CONSTRAINT "EventSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventKnowledgeArea" ADD CONSTRAINT "EventKnowledgeArea_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventKnowledgeArea" ADD CONSTRAINT "EventKnowledgeArea_knowledgeAreaId_fkey" FOREIGN KEY ("knowledgeAreaId") REFERENCES "KnowledgeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upskilling" ADD CONSTRAINT "Upskilling_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed starting event categories
INSERT INTO "EventCategory" (id, name) VALUES
  (gen_random_uuid(), 'Training'),
  (gen_random_uuid(), 'Tasting'),
  (gen_random_uuid(), 'Social'),
  (gen_random_uuid(), 'Other')
ON CONFLICT (name) DO NOTHING;
