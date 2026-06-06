import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { countDeckCards } from "@/lib/matchDeck";

/**
 * @route GET /api/decks
 * @description Get all decks for the current user
 * @returns Array of user decks with visibility settings
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const decks = await prisma.deck.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        title: true,
        visibility: true,
        deckJson: true,
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    const result = decks.map((deck) => {
      const cardCount = countDeckCards(deck.deckJson);

      return {
        id: deck.id,
        name: deck.title,
        visibility: deck.visibility,
        cardCount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching decks:", error);
    return NextResponse.json(
      { error: "Failed to fetch decks" },
      { status: 500 }
    );
  }
}
