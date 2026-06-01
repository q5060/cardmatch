"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DECK_VISIBILITY } from "@/lib/constants";
import { Deck } from "@prisma/client";

export async function createDeck(formData: FormData): Promise<Deck> {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "PUBLIC");
  const deckJson = String(formData.get("deckJson") ?? "").trim() || null;

  if (!title) throw new Error("INVALID_TITLE");

  const newDeck = await prisma.deck.create({
    data: {
      userId: session.userId,
      title: title.slice(0, 120),
      notes: notes.slice(0, 2000),
      visibility:
        visibility === DECK_VISIBILITY.PRIVATE
          ? DECK_VISIBILITY.PRIVATE
          : DECK_VISIBILITY.PUBLIC,
      deckJson: deckJson ? deckJson.slice(0, 50_000) : null,
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
