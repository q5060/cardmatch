import prisma from "@/lib/prisma";
import { DECK_VISIBILITY } from "@/lib/constants";

export type DeckSummary = {
  id: string;
  title: string;
  visibility: string;
};

/** Deck summary plus whether the viewer may open and see card list. */
export type DeckSummaryWithAccess = DeckSummary & {
  canViewCards: boolean;
};

export type DeckCardRow = {
  id: number;
  name: string;
  imageUrl?: string | null;
  count: number;
  category?: string;
};

export type DeckSummaryWithCards = DeckSummary & {
  cards: DeckCardRow[] | null;
  canViewCards: boolean;
};

async function areFriends(userId1: number, userId2: number): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
      status: "ACCEPTED",
    },
  });
  return !!friendship;
}

export async function canViewDeckContent(
  deck: { userId: number; visibility: string },
  viewerId: number | null,
): Promise<boolean> {
  if (viewerId !== null && viewerId === deck.userId) return true;
  if (!viewerId) return deck.visibility === DECK_VISIBILITY.PUBLIC;
  if (deck.visibility === DECK_VISIBILITY.PRIVATE) return false;
  if (deck.visibility === DECK_VISIBILITY.PUBLIC) return true;
  if (deck.visibility === DECK_VISIBILITY.FRIENDS) {
    return areFriends(deck.userId, viewerId);
  }
  return false;
}

export async function assertUserOwnsDeck(userId: number, deckId: string) {
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId },
    select: { id: true },
  });
  if (!deck) throw new Error("找不到牌組");
}

export function toDeckSummary(
  deck: { id: string; title: string; visibility: string } | null | undefined,
): DeckSummary | null {
  if (!deck) return null;
  return { id: deck.id, title: deck.title, visibility: deck.visibility };
}

export function parseDeckCards(deckJson: string | null | undefined): DeckCardRow[] | null {
  if (!deckJson) return null;
  try {
    const parsed = JSON.parse(deckJson);
    return Array.isArray(parsed) ? (parsed as DeckCardRow[]) : null;
  } catch {
    return null;
  }
}

export async function resolveDeckForViewer(input: {
  deck: {
    id: string;
    userId: number;
    title: string;
    visibility: string;
    deckJson: string | null;
  } | null;
  viewerId: number | null;
  /** When true, match participants see full deckJson regardless of visibility. */
  bypassVisibility?: boolean;
}): Promise<DeckSummaryWithCards | null> {
  const { deck, viewerId, bypassVisibility } = input;
  if (!deck) return null;

  const summary = toDeckSummary(deck)!;
  const canView =
    bypassVisibility === true ||
    (await canViewDeckContent(deck, viewerId));

  return {
    ...summary,
    canViewCards: canView,
    cards: canView ? parseDeckCards(deck.deckJson) : null,
  };
}

type MatchWithDecks = {
  playerAId: number;
  playerBId: number;
  playerADeck: {
    id: string;
    userId: number;
    title: string;
    visibility: string;
    deckJson: string | null;
  } | null;
  playerBDeck: {
    id: string;
    userId: number;
    title: string;
    visibility: string;
    deckJson: string | null;
  } | null;
};

export async function getMatchDeckSidesForViewer(
  match: MatchWithDecks,
  viewerId: number | null,
  options?: { bypassVisibilityForParticipant?: boolean },
): Promise<{
  playerA: DeckSummaryWithCards | null;
  playerB: DeckSummaryWithCards | null;
  myDeck: DeckSummaryWithCards | null;
  theirDeck: DeckSummaryWithCards | null;
}> {
  const isParticipant =
    viewerId !== null &&
    (match.playerAId === viewerId || match.playerBId === viewerId);
  const bypass =
    options?.bypassVisibilityForParticipant === true && isParticipant;

  const playerA = await resolveDeckForViewer({
    deck: match.playerADeck,
    viewerId,
    bypassVisibility: bypass,
  });
  const playerB = await resolveDeckForViewer({
    deck: match.playerBDeck,
    viewerId,
    bypassVisibility: bypass,
  });

  if (viewerId === null) {
    return { playerA, playerB, myDeck: null, theirDeck: null };
  }

  const iAmA = match.playerAId === viewerId;
  return {
    playerA,
    playerB,
    myDeck: iAmA ? playerA : playerB,
    theirDeck: iAmA ? playerB : playerA,
  };
}

export const matchDeckInclude = {
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
} as const;

export const announcementDeckInclude = {
  deck: {
    select: { id: true, title: true, visibility: true },
  },
} as const;

export function deckIdsForInviteMatch(input: {
  playerAId: number;
  playerBId: number;
  publisherId: number;
  inviterId: number;
  publisherDeckId: string | null | undefined;
  inviterDeckId: string | null | undefined;
}): { playerADeckId: string | null; playerBDeckId: string | null } {
  const publisherDeck =
    input.publisherId === input.playerAId
      ? input.publisherDeckId ?? null
      : input.publisherId === input.playerBId
        ? input.publisherDeckId ?? null
        : null;
  const inviterDeck =
    input.inviterId === input.playerAId
      ? input.inviterDeckId ?? null
      : input.inviterId === input.playerBId
        ? input.inviterDeckId ?? null
        : null;

  return {
    playerADeckId:
      input.playerAId === input.publisherId
        ? publisherDeck
        : input.playerAId === input.inviterId
          ? inviterDeck
          : null,
    playerBDeckId:
      input.playerBId === input.publisherId
        ? publisherDeck
        : input.playerBId === input.inviterId
          ? inviterDeck
          : null,
  };
}
