"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DECK_VISIBILITY } from "@/lib/constants";
import { Deck } from "@prisma/client";
import { fetchOfficialDeck } from "@/lib/deckScrapper";

const VALID_VISIBILITIES = [
  DECK_VISIBILITY.PUBLIC,
  DECK_VISIBILITY.FRIENDS,
  DECK_VISIBILITY.PRIVATE,
] as const;

type DeckVisibility = (typeof VALID_VISIBILITIES)[number];

function parseVisibility(visibility: string): DeckVisibility {
  return VALID_VISIBILITIES.includes(visibility as DeckVisibility)
    ? (visibility as DeckVisibility)
    : DECK_VISIBILITY.PUBLIC;
}

export async function createDeck(formData: FormData): Promise<Deck> {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "PUBLIC");
  const officialCode = String(formData.get("officialCode") ?? "").trim();
  const finalVisibility = parseVisibility(visibility);

  let finalDeckJson = String(formData.get("deckJson") ?? "").trim() || null;

  if (!title) throw new Error("INVALID_TITLE");

  if (officialCode) {
    try {
      const { cards: scrapedCards } = await fetchOfficialDeck(officialCode);
      const imageUrls = scrapedCards.map((c) => c.imageUrl);

      const dbCards = await prisma.card.findMany({
        where: {
          imageUrl: { in: imageUrls },
        },
      });

      const deckCards = dbCards.map((dbCard) => {
        const scrapedData = scrapedCards.find(
          (c) => c.imageUrl === dbCard.imageUrl,
        );
        return {
          id: dbCard.id,
          name: dbCard.name,
          imageUrl: dbCard.imageUrl,
          count: scrapedData?.count ?? 1,
          category: dbCard.category,
        };
      });

      finalDeckJson = JSON.stringify(deckCards);
    } catch (error) {
      console.error("解析官方牌組失敗:", error);
    }
  }

  const maxSort = await prisma.deck.aggregate({
    where: { userId: session.userId },
    _max: { sortOrder: true },
  });

  const newDeck = await prisma.deck.create({
    data: {
      userId: session.userId,
      title: title.slice(0, 120),
      notes: notes.slice(0, 2000),
      visibility: finalVisibility,
      deckJson: finalDeckJson ? finalDeckJson.slice(0, 50_000) : null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
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

  const finalVisibility = parseVisibility(visibility);

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

  if (!title) throw new Error("INVALID_TITLE");

  const finalVisibility = parseVisibility(visibility);

  // Only update deckJson when the form explicitly sends it (avoids clearing cards on settings-only save).
  const updateData: {
    title: string;
    notes: string;
    visibility: DeckVisibility;
    deckJson?: string | null;
  } = {
    title: title.slice(0, 120),
    notes: notes.slice(0, 2000),
    visibility: finalVisibility,
  };

  if (formData.has("deckJson")) {
    const dj = String(formData.get("deckJson") ?? "").trim();
    updateData.deckJson = dj ? dj.slice(0, 50_000) : null;
  }

  await prisma.deck.update({
    where: { id: deckId, userId: session.userId },
    data: updateData,
  });

  revalidatePath("/profile");
  revalidatePath(`/decks/${deckId}/edit`);
}
