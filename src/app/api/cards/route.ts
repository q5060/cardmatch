import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // 從 URL 中取得查詢參數
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  
  // 取得篩選參數
  const categoryFilter = searchParams.get("category"); // 來自前端的選單值
  const type = searchParams.get("type");
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  // 動態構建 Prisma 查詢條件
  let where: Prisma.CardWhereInput = {};

  // 1. 處理類別與子類型的邏輯 (***待修改，爬蟲有問題***)
  if (categoryFilter === "POKEMON") {
    where.category = "POKEMON";
  } else if (categoryFilter === "支援者") {
    where.category = "TRAINER";
    where.subType = "支援者卡"; 
  } else if (categoryFilter === "物品") {
    where.category = "TRAINER";
    where.subType = "物品卡"; 
  } else if (categoryFilter === "寶可夢道具") {
    where.category = "TRAINER";
    where.subType = "寶可夢道具"; 
  } else if (categoryFilter === "競技場") {
    where.category = "TRAINER";
    where.subType = "競技場卡";
  } else if (categoryFilter === "ENERGY") {
    where.category = "ENERGY";
  }

  // 2. 處理寶可夢專屬篩選
  if (type) where.type = type;
  if (stage) where.stage = stage;

  // 3. 處理關鍵字搜尋
  if (search) {
    where.name = { contains: search };
  }

  
  // 計算跳過的筆數
  const skip = (page - 1) * limit;

  try {
    // 同時取得資料和總筆數（方便前端判斷是否還有下一頁）
    const [cards, totalCount] = await prisma.$transaction([
      prisma.card.findMany({
        skip: skip,
        take: limit,
        orderBy: { id: 'asc' }, // 建議固定排序，避免分頁重複
      }),
      prisma.card.count()({ where }),
    ]);

    return NextResponse.json({
      cards,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      hasMore: skip + cards.length < totalCount
    });
  } catch (error) {
    return NextResponse.json({ error: "無法載入卡片" }, { status: 500 });
  }
}