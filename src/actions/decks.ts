"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DECK_VISIBILITY } from "@/lib/constants";
import { Deck } from "@prisma/client";
import { fetchOfficialDeck } from "@/lib/deckScrapper";

export async function createDeck(formData: FormData): Promise<Deck> {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "PUBLIC");
  const deckJson = String(formData.get("deckJson") ?? "").trim() || null;
  const officialCode = String(formData.get("officialCode") ?? "").trim();
  
  // 預設的 deckJson (空牌組或前端傳入的自訂牌組)
  let finalDeckJson = String(formData.get("deckJson") ?? "").trim() || null;

  if (!title) throw new Error("INVALID_TITLE");

  // 若有 officialCode，執行爬蟲並覆蓋 finalDeckJson
  if (officialCode) {
    try {
      const { cards: scrapedCards } = await fetchOfficialDeck(officialCode);
      
      // 提取所有抓到的圖片網址
      const imageUrls = scrapedCards.map(c => c.imageUrl);

      // 🟢 1. 印出我們要去 DB 找的網址長怎樣
      console.log("[對應測試] 準備搜尋的圖片網址:", imageUrls);

      // 透過圖片網址從資料庫尋找對應的卡片
      const dbCards = await prisma.card.findMany({
        where: {
          imageUrl: { in: imageUrls }
        }
      });

      // 🟢 2. 印出資料庫到底有沒有找到東西
      console.log(`[對應測試] 從資料庫找到 ${dbCards.length} 張對應卡片`);

      // 組合符合前端 DeckCard 格式的 JSON
      const deckCards = dbCards.map(dbCard => {
        // 找出爬蟲結果中對應數量的資料
        const scrapedData = scrapedCards.find(c => c.imageUrl === dbCard.imageUrl);
        return {
          id: dbCard.id,
          name: dbCard.name,
          imageUrl: dbCard.imageUrl,
          count: scrapedData?.count || 1,
          category: dbCard.category
        };
      });

      finalDeckJson = JSON.stringify(deckCards);
      console.log("[對應測試] 準備存入的 JSON:", finalDeckJson);
    } catch (error) {
      console.error("解析官方牌組失敗:", error);
      // 你可以根據需求決定要 throw Error 阻斷建立，還是退回建立空牌組
      // throw new Error("FETCH_OFFICIAL_FAILED"); 
    }
  }

  const newDeck = await prisma.deck.create({
    data: {
      userId: session.userId,
      title: title.slice(0, 120),
      notes: notes.slice(0, 2000),
      visibility:
        visibility === DECK_VISIBILITY.PRIVATE
          ? DECK_VISIBILITY.PRIVATE
          : DECK_VISIBILITY.PUBLIC,
      deckJson: finalDeckJson ? finalDeckJson.slice(0, 50_000) : null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  return newDeck;
}

/** For `<form action={...}>` — must return void, not Deck. */
export async function submitCreateDeck(formData: FormData): Promise<void> {
  await createDeck(formData);
}

export async function deleteDeck(deckId: string) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  await prisma.deck.deleteMany({
    where: { id: deckId, userId: session.userId },
  });

  revalidatePath("/profile");
}

export async function updateDeckVisibility(deckId: string, visibility: string) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const v =
    visibility === DECK_VISIBILITY.PRIVATE
      ? DECK_VISIBILITY.PRIVATE
      : DECK_VISIBILITY.PUBLIC;

  await prisma.deck.updateMany({
    where: { id: deckId, userId: session.userId },
    data: { visibility: v },
  });

  revalidatePath("/profile");
}

export async function updateDeck(deckId: string, formData: FormData) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "PUBLIC");

  if (!title) throw new Error("INVALID_TITLE");

  // 注意!! 修改以下程式碼，會導致儲存牌組設定時，清空牌組編成的BUG
  // 1. 先建立基礎更新資料
  const updateData: any = {
    title: title.slice(0, 120),
    notes: notes.slice(0, 2000),
    visibility:
      visibility === DECK_VISIBILITY.PRIVATE
        ? DECK_VISIBILITY.PRIVATE
        : DECK_VISIBILITY.PUBLIC,
  };

  // 2. 只有當 formData 真的有這個 key 時，才加入更新物件
  if (formData.has("deckJson")) {
    const dj = String(formData.get("deckJson") ?? "").trim();
    updateData.deckJson = dj ? dj.slice(0, 50_000) : null;
  }

  // 3. 執行更新
  await prisma.deck.update({
    where: { id: deckId, userId: session.userId },
    data: updateData,
  });

  revalidatePath("/profile");
  revalidatePath(`/decks/${deckId}/edit`); // 更新編輯頁面緩存
}
