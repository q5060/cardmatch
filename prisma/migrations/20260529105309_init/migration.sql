-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stage" TEXT,
    "type" TEXT,
    "hp" INTEGER,
    "subType" TEXT,
    "isAceSpec" BOOLEAN NOT NULL DEFAULT false,
    "regulationMark" TEXT,
    "imageUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_sourceUrl_key" ON "Card"("sourceUrl");
