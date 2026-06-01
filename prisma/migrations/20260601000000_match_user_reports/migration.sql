-- AlterTable
ALTER TABLE "UserReport" ADD COLUMN "matchId" INTEGER,
ADD COLUMN "categories" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "UserReport_matchId_idx" ON "UserReport"("matchId");

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
