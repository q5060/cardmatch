/*
  Warnings:

  - You are about to drop the column `outcome` on the `BattleResult` table. All the data in the column will be lost.
  - You are about to drop the column `reporterId` on the `BattleResult` table. All the data in the column will be lost.
  - You are about to alter the column `matchId` on the `BattleResult` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `userId` on the `Deck` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `senderId` on the `FriendMessage` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `addresseeId` on the `Friendship` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `requesterId` on the `Friendship` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Match` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `invitedById` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `playerAId` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `playerBId` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `userId` on the `MatchQueueEntry` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `userId` on the `MeetSpot` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `matchId` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `senderId` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `winnerId` to the `BattleResult` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT,
    "senderId" INTEGER,
    "data" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BattleResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" INTEGER NOT NULL,
    "winnerId" INTEGER NOT NULL,
    "playerAAgreed" BOOLEAN NOT NULL DEFAULT false,
    "playerBAgreed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BattleResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BattleResult_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BattleResult" ("createdAt", "id", "matchId") SELECT "createdAt", "id", "matchId" FROM "BattleResult";
DROP TABLE "BattleResult";
ALTER TABLE "new_BattleResult" RENAME TO "BattleResult";
CREATE UNIQUE INDEX "BattleResult_matchId_key" ON "BattleResult"("matchId");
CREATE TABLE "new_Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "deckJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Deck" ("createdAt", "deckJson", "id", "notes", "title", "updatedAt", "userId", "visibility") SELECT "createdAt", "deckJson", "id", "notes", "title", "updatedAt", "userId", "visibility" FROM "Deck";
DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
CREATE TABLE "new_FriendMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "friendshipId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FriendMessage_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "Friendship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FriendMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FriendMessage" ("body", "createdAt", "friendshipId", "id", "senderId") SELECT "body", "createdAt", "friendshipId", "id", "senderId" FROM "FriendMessage";
DROP TABLE "FriendMessage";
ALTER TABLE "new_FriendMessage" RENAME TO "FriendMessage";
CREATE TABLE "new_Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" INTEGER NOT NULL,
    "addresseeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Friendship" ("addresseeId", "createdAt", "id", "requesterId", "status", "updatedAt") SELECT "addresseeId", "createdAt", "id", "requesterId", "status", "updatedAt" FROM "Friendship";
DROP TABLE "Friendship";
ALTER TABLE "new_Friendship" RENAME TO "Friendship";
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerAId" INTEGER NOT NULL,
    "playerBId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITE_PENDING',
    "playerAReady" BOOLEAN NOT NULL DEFAULT false,
    "playerBReady" BOOLEAN NOT NULL DEFAULT false,
    "meetLat" REAL NOT NULL,
    "meetLng" REAL NOT NULL,
    "meetLabel" TEXT NOT NULL,
    "shopId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "id", "invitedById", "meetLabel", "meetLat", "meetLng", "playerAId", "playerAReady", "playerBId", "playerBReady", "shopId", "status", "updatedAt") SELECT "createdAt", "id", "invitedById", "meetLabel", "meetLat", "meetLng", "playerAId", "playerAReady", "playerBId", "playerBReady", "shopId", "status", "updatedAt" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_MatchQueueEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'RANDOM',
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "radiusKm" REAL NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchQueueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MatchQueueEntry" ("createdAt", "id", "lat", "lng", "mode", "radiusKm", "userId") SELECT "createdAt", "id", "lat", "lng", "mode", "radiusKm", "userId" FROM "MatchQueueEntry";
DROP TABLE "MatchQueueEntry";
ALTER TABLE "new_MatchQueueEntry" RENAME TO "MatchQueueEntry";
CREATE UNIQUE INDEX "MatchQueueEntry_userId_key" ON "MatchQueueEntry"("userId");
CREATE TABLE "new_MeetSpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "label" TEXT NOT NULL,
    "timeNote" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "looking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetSpot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MeetSpot" ("active", "createdAt", "id", "label", "lat", "lng", "looking", "timeNote", "updatedAt", "userId") SELECT "active", "createdAt", "id", "label", "lat", "lng", "looking", "timeNote", "updatedAt", "userId" FROM "MeetSpot";
DROP TABLE "MeetSpot";
ALTER TABLE "new_MeetSpot" RENAME TO "MeetSpot";
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("body", "createdAt", "id", "matchId", "senderId") SELECT "body", "createdAt", "id", "matchId", "senderId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "defaultShopId" TEXT,
    "battleRecordVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "winrateVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "displayName", "email", "id", "passwordHash", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "displayName", "email", "id", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
