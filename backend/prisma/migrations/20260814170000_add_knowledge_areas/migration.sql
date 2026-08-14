-- CreateTable
CREATE TABLE "KnowledgeArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "KnowledgeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_KnowledgeAreaToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KnowledgeAreaToProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArea_name_key" ON "KnowledgeArea"("name");

-- CreateIndex
CREATE INDEX "_KnowledgeAreaToProfile_B_index" ON "_KnowledgeAreaToProfile"("B");

-- AddForeignKey
ALTER TABLE "_KnowledgeAreaToProfile" ADD CONSTRAINT "_KnowledgeAreaToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "KnowledgeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KnowledgeAreaToProfile" ADD CONSTRAINT "_KnowledgeAreaToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

