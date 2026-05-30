CREATE TABLE "ShopReport" (
    "id"         TEXT NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "type"       TEXT NOT NULL,
    "shopId"     TEXT,
    "shopName"   TEXT,
    "address"    TEXT,
    "note"       TEXT,
    "status"     TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopReport_status_idx" ON "ShopReport"("status");

ALTER TABLE "ShopReport" ADD CONSTRAINT "ShopReport_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopReport" ADD CONSTRAINT "ShopReport_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
