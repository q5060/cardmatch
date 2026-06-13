-- AlterTable
ALTER TABLE "BattleResult" ADD COLUMN "playerANotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BattleResult" ADD COLUMN "playerANotesVisibility" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "BattleResult" ADD COLUMN "playerBNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BattleResult" ADD COLUMN "playerBNotesVisibility" TEXT NOT NULL DEFAULT 'PUBLIC';
