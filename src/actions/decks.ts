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

  // Validate visibility value
  const validVisibilities = [
    DECK_VISIBILITY.PUBLIC,
    DECK_VISIBILITY.FRIENDS,
    DECK_VISIBILITY.PRIVATE,
  ];
  const finalVisibility = validVisibilities.includes(visibility as any)
    ? visibility
    : DECK_VISIBILITY.PUBLIC;

  const newDeck = await prisma.deck.create({
    data: {
      userId: session.userId,
      title: title.slice(0, 120),
      notes: notes.slice(0, 2000),
      visibility: finalVisibility,
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

  // Validate visibility value
  const validVisibilities = [
    DECK_VISIBILITY.PUBLIC,
    DECK_VISIBILITY.FRIENDS,
    DECK_VISIBILITY.PRIVATE,
  ];
  const finalVisibility = validVisibilities.includes(visibility as any)
    ? visibility
    : DECK_VISIBILITY.PUBLIC;

  await prisma.deck.updateMany({
    where: { id: deckId, userId: session.userId },
    data: { visibility: finalVisibility },
  });

  revalidatePath("/profile");
}

export async function updateDeck(deckId: string, formData: FormData) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "PUBLIC");
  const deckJsonInput = String(formData.get("deckJson") ?? "").trim() || null;

  if (!title) throw new Error("INVALID_TITLE");

  // Validate visibility value
  const validVisibilities = [
    DECK_VISIBILITY.PUBLIC,
    DECK_VISIBILITY.FRIENDS,
    DECK_VISIBILITY.PRIVATE,
  ];
  const finalVisibility = validVisibilities.includes(visibility as any)
    ? visibility
    : DECK_VISIBILITY.PUBLIC;

  // Build update data - only include fields that should be updated
  type UpdateData = {
    title: string;
    notes: string;
    visibility: string;
    deckJson?: string | null;
  };
  
  const updateData: UpdateData = {
    title: title.slice(0, 120),
    notes: notes.slice(0, 2000),
    visibility: finalVisibility,
  };
  
  // Only update deckJson if explicitly provided
  if (deckJsonInput !== null) {
    updateData.deckJson = deckJsonInput.slice(0, 50_000);
  }

  await prisma.deck.update({
    where: { id: deckId, userId: session.userId },
    data: updateData,
  });

  revalidatePath("/profile");
  revalidatePath(`/decks/${deckId}/edit`); // 更新編輯頁面緩存
}
