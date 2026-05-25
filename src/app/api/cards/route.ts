import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const cards = await prisma.card.findMany({ take: 20 }); // 先拿20張測試
  return NextResponse.json(cards);
}