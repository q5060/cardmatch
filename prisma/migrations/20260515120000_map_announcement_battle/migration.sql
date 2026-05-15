-- DropTable
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "MatchQueueEntry";
PRAGMA foreign_keys=ON;

-- AlterTable
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MeetSpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "label" TEXT NOT NULL,
    "timeNote" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "looking" BOOLEAN NOT NULL DEFAULT false,
    "shopId" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetSpot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetSpot_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MeetSpot" ("active", "createdAt", "id", "label", "lat", "lng", "looking", "timeNote", "updatedAt", "userId")
SELECT "active", "createdAt", "id", "label", "lat", "lng", "looking", "timeNote", "updatedAt", "userId" FROM "MeetSpot";
DROP TABLE "MeetSpot";
ALTER TABLE "new_MeetSpot" RENAME TO "MeetSpot";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
