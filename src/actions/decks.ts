"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DECK_VISIBILITY } from "@/lib/constants";
import { Deck } from "@prisma/client";

export async function createDeck(prevState: any, formData: FormData): Promise<Deck | null> {
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
  return newDeck;
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

  // 確認 formData 裡面有沒有傳入 deckJson 這個 key
  const hasDeckJson = formData.has("deckJson");
  const deckJson = hasDeckJson ? String(formData.get("deckJson") ?? "").trim() : undefined;

  if (!title) throw new Error("INVALID_TITLE");

  // 構建更新用的資料物件
  const updateData: any = {
    title: title.slice(0, 120),
    notes: notes.slice(0, 2000),
    visibility:
      visibility === DECK_VISIBILITY.PRIVATE
        ? DECK_VISIBILITY.PRIVATE
        : DECK_VISIBILITY.PUBLIC,
  };

  // 只有當有傳入deckJson時，才加入deckJson到更新清單中
  // 在 Prisma 中，若屬性為 undefined，該欄位就不會被更新
  if (hasDeckJson) {
    updateData.deckJson = deckJson ? deckJson.slice(0, 50_000) : null;
  }

  const updatedDeck = await prisma.deck.update({
    where: { id: deckId, userId: session.userId },
    data: updateData,
  });

  revalidatePath("/profile");
  revalidatePath(`/decks/${deckId}/edit`); // 更新編輯頁面緩存
}
