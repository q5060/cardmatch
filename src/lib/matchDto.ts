import { cache } from "react";
import prisma from "@/lib/prisma";
import { getActiveMatchForUser } from "@/lib/queries";
import {
  getMatchDeckSidesForViewer,
  type DeckCardRow,
  type DeckSummaryWithCards,
} from "@/lib/matchDeck";

export type { DeckSummaryWithCards, DeckCardRow };

export type ActiveMatchDTO = {
  id: number;
  status: string;
  invitedById: number;
  playerAId: number;
  playerBId: number;
  playerAReady: boolean;
  playerBReady: boolean;
  cancelRequestedBy?: number | null;
  meetLat: number;
  meetLng: number;
  meetLabel: string;
  playerA: {
    id: number;
    displayName: string;
    avatarUrl?: string | null;
    gender: string;
    age: number | null;
  };
  playerB: {
    id: number;
    displayName: string;
    avatarUrl?: string | null;
    gender: string;
    age: number | null;
  };
  myDeck: DeckSummaryWithCards | null;
  theirDeck: DeckSummaryWithCards | null;
};

export type BattleResultDTO = {
  id: string;
  matchId: number;
  winnerId: number | null;
  playerAAgreed: boolean;
  playerBAgreed: boolean;
  status: string;
} | null;

type MatchRow = NonNullable<Awaited<ReturnType<typeof getActiveMatchForUser>>>;

function matchRowToActiveMatchSummary(m: MatchRow): ActiveMatchDTO {
  return {
    id: m.id,
    status: m.status,
    invitedById: m.invitedById,
    playerAId: m.playerAId,
    playerBId: m.playerBId,
    playerAReady: m.playerAReady,
    playerBReady: m.playerBReady,
    cancelRequestedBy: m.cancelRequestedBy,
    meetLat: m.meetLat,
    meetLng: m.meetLng,
    meetLabel: m.meetLabel,
    playerA: m.playerA,
    playerB: m.playerB,
    myDeck: null,
    theirDeck: null,
  };
}

export async function toActiveMatchDTO(
  m: MatchRow,
  viewerId: number,
): Promise<ActiveMatchDTO> {
  const decks = await getMatchDeckSidesForViewer(m, viewerId, {
    bypassVisibilityForParticipant: true,
  });

  return {
    ...matchRowToActiveMatchSummary(m),
    myDeck: decks.myDeck,
    theirDeck: decks.theirDeck,
  };
}

/** Lightweight active match for GlobalMatchCeremony (no deck resolution). */
export const fetchActiveMatchSummaryForShell = cache(
  async (userId: number): Promise<ActiveMatchDTO | null> => {
    const activeMatch = await getActiveMatchForUser(userId);
    if (!activeMatch) return null;
    return matchRowToActiveMatchSummary(activeMatch);
  },
);

export const fetchActiveMatchPayload = cache(
  async (
    userId: number,
  ): Promise<{
    activeMatch: ActiveMatchDTO | null;
    battleResult: BattleResultDTO;
  }> => {
    const activeMatch = await getActiveMatchForUser(userId);
    if (!activeMatch) {
      return { activeMatch: null, battleResult: null };
    }

    const [dto, result] = await Promise.all([
      toActiveMatchDTO(activeMatch, userId),
      prisma.battleResult.findUnique({
        where: { matchId: activeMatch.id },
      }),
    ]);

    return {
      activeMatch: dto,
      battleResult: result
        ? {
            id: result.id,
            matchId: result.matchId,
            winnerId: result.winnerId,
            playerAAgreed: result.playerAAgreed,
            playerBAgreed: result.playerBAgreed,
            status: result.status,
          }
        : null,
    };
  },
);
