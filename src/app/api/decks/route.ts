import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
      orderBy: { updatedAt: "desc" },
    });

    // Transform to include cardCount (parsed from deckJson)
    const result = decks.map((deck) => {
      let cardCount = 0;
      if (deck.deckJson) {
        try {
          const parsed = JSON.parse(deck.deckJson);
          // Assuming deckJson has a 'cards' array or similar structure
          cardCount = Array.isArray(parsed) ? parsed.length : 
                     parsed.cards ? parsed.cards.length : 0;
        } catch (e) {
          // If parsing fails, try counting lines
          cardCount = deck.deckJson.split('\n').filter(line => line.trim()).length;
        }
      }
      
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
