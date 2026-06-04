import prisma from "@/lib/prisma";
import { MATCH_ACTIVE_STATUSES } from "@/lib/constants";
import {
  canViewDeckContent,
  parseDeckCards,
  type DeckCardRow,
} from "@/lib/matchDeck";

export type DisclosedDeckPreview = {
  id: string;
  title: string;
  visibility: string;
  canViewCards: boolean;
  cards: DeckCardRow[];
};

async function buildPreview(
  deck: {
    id: string;
    userId: number;
    title: string;
    visibility: string;
    deckJson: string | null;
  },
  viewerId: number,
): Promise<DisclosedDeckPreview> {
  const canViewCards = await canViewDeckContent(deck, viewerId);
  return {
    id: deck.id,
    title: deck.title,
    visibility: deck.visibility,
    canViewCards,
    cards: canViewCards ? (parseDeckCards(deck.deckJson) ?? []) : [],
  };
}

/** Deck on an active announcement — name always visible; cards per visibility. */
export async function getDeckDisclosedViaSpot(
  deckId: string,
  spotId: string,
  viewerId: number,
): Promise<DisclosedDeckPreview | null> {
  const spot = await prisma.meetSpot.findFirst({
    where: {
      id: spotId,
      deckId,
      looking: true,
      active: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      deck: {
        select: {
          id: true,
          userId: true,
          title: true,
          visibility: true,
          deckJson: true,
        },
      },
    },
  });
  if (!spot?.deck) return null;
  return buildPreview(spot.deck, viewerId);
}

/** Deck on an active match — name always visible to opponent; cards per visibility. */
export async function getDeckDisclosedViaMatch(
  deckId: string,
  matchId: number,
  viewerId: number,
): Promise<DisclosedDeckPreview | null> {
  const m = await prisma.match.findFirst({
    where: {
      id: matchId,
      status: { in: MATCH_ACTIVE_STATUSES },
      OR: [{ playerAId: viewerId }, { playerBId: viewerId }],
    },
    include: {
      playerADeck: {
        select: {
          id: true,
          userId: true,
          title: true,
          visibility: true,
          deckJson: true,
        },
      },
      playerBDeck: {
        select: {
          id: true,
          userId: true,
          title: true,
          visibility: true,
          deckJson: true,
        },
      },
    },
  });

  if (!m) return null;
  const deck =
    m.playerADeck?.id === deckId
      ? m.playerADeck
      : m.playerBDeck?.id === deckId
        ? m.playerBDeck
        : null;
  if (!deck) return null;

  return buildPreview(deck, viewerId);
}
