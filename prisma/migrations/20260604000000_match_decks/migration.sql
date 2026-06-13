-- AlterTable
ALTER TABLE "MeetSpot" ADD COLUMN "deckId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "playerADeckId" TEXT;
ALTER TABLE "Match" ADD COLUMN "playerBDeckId" TEXT;

-- AddForeignKey
ALTER TABLE "MeetSpot" ADD CONSTRAINT "MeetSpot_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerADeckId_fkey" FOREIGN KEY ("playerADeckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerBDeckId_fkey" FOREIGN KEY ("playerBDeckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
