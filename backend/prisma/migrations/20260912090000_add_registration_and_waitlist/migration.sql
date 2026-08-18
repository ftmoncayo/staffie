-- CreateTable
CREATE TABLE "RegistrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "requireCode" BOOLEAN NOT NULL DEFAULT false,
    "currentCode" TEXT,

    CONSTRAINT "RegistrationSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the single settings row so app code never has to handle a missing
-- row — this is a singleton table, always exactly one row at id 'singleton'.
INSERT INTO "RegistrationSettings" ("id", "requireCode", "currentCode") VALUES ('singleton', false, NULL);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "venueId" TEXT,
    "otherVenueName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
