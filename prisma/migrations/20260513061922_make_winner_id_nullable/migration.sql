-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BattleResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "playerAAgreed" BOOLEAN NOT NULL DEFAULT false,
    "playerBAgreed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BattleResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BattleResult_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BattleResult" ("createdAt", "id", "matchId", "playerAAgreed", "playerBAgreed", "status", "winnerId") SELECT "createdAt", "id", "matchId", "playerAAgreed", "playerBAgreed", "status", "winnerId" FROM "BattleResult";
DROP TABLE "BattleResult";
ALTER TABLE "new_BattleResult" RENAME TO "BattleResult";
CREATE UNIQUE INDEX "BattleResult_matchId_key" ON "BattleResult"("matchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
