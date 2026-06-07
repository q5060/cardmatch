-- Performance indexes for hot query paths (matches, announcements, notifications)

CREATE INDEX IF NOT EXISTS "Match_playerAId_status_idx" ON "Match"("playerAId", "status");
CREATE INDEX IF NOT EXISTS "Match_playerBId_status_idx" ON "Match"("playerBId", "status");
CREATE INDEX IF NOT EXISTS "MeetSpot_active_looking_expiresAt_idx" ON "MeetSpot"("active", "looking", "expiresAt");
CREATE INDEX IF NOT EXISTS "MeetSpot_shopId_idx" ON "MeetSpot"("shopId");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
