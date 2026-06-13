-- AlterTable
ALTER TABLE "Deck" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Preserve existing display order (updatedAt desc → sortOrder 0, 1, 2, …)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC) - 1 AS rn
  FROM "Deck"
)
UPDATE "Deck" AS d
SET "sortOrder" = ranked.rn
FROM ranked
WHERE d.id = ranked.id;
