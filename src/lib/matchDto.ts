import prisma from "@/lib/prisma";
import { getActiveMatchForUser } from "@/lib/queries";

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
  playerA: { id: number; displayName: string; avatarUrl?: string | null };
  playerB: { id: number; displayName: string; avatarUrl?: string | null };
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

export function toActiveMatchDTO(m: MatchRow): ActiveMatchDTO {
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
  };
}

export async function fetchActiveMatchPayload(userId: number): Promise<{
  activeMatch: ActiveMatchDTO | null;
  battleResult: BattleResultDTO;
}> {
  const activeMatch = await getActiveMatchForUser(userId);
  if (!activeMatch) {
    return { activeMatch: null, battleResult: null };
  }

  const result = await prisma.battleResult.findUnique({
    where: { matchId: activeMatch.id },
  });

  return {
    activeMatch: toActiveMatchDTO(activeMatch),
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
}
