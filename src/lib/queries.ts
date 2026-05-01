import prisma from "./prisma";
import {
  BATTLE_OUTCOME,
  MATCH_ACTIVE_STATUSES,
  MATCH_STATUS,
} from "./constants";

export async function getShops() {
  return prisma.shop.findMany({ orderBy: { name: "asc" } });
}

export async function getLobbyPeers(excludeUserId: string) {
  const spots = await prisma.meetSpot.findMany({
    where: {
      looking: true,
      active: true,
      userId: { not: excludeUserId },
    },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  return spots.map((s) => ({
    userId: s.userId,
    displayName: s.user.displayName,
    avatarUrl: s.user.avatarUrl,
    lat: s.lat,
    lng: s.lng,
    label: s.label,
    timeNote: s.timeNote,
    spotId: s.id,
  }));
}

/** Active lobby/battle rows involving this user (excludes completed/cancelled). */
export async function countActiveMatchesForUser(userId: string, excludeMatchId?: string) {
  return prisma.match.count({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: { in: MATCH_ACTIVE_STATUSES },
      ...(excludeMatchId ? { NOT: { id: excludeMatchId } } : {}),
    },
  });
}

export async function getActiveMatchForUser(userId: string) {
  return prisma.match.findFirst({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: { in: MATCH_ACTIVE_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      playerA: { select: { id: true, displayName: true } },
      playerB: { select: { id: true, displayName: true } },
      shop: true,
    },
  });
}

export async function getMatchHistory(userId: string, take = 15) {
  return prisma.match.findMany({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: MATCH_STATUS.COMPLETED,
    },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      playerA: { select: { id: true, displayName: true } },
      playerB: { select: { id: true, displayName: true } },
      battleResults: true,
    },
  });
}

export async function userInQueue(userId: string) {
  return prisma.matchQueueEntry.findUnique({ where: { userId } });
}

export type ProfileBattleStats = {
  completedTotal: number;
  recordedTotal: number;
  wins: number;
  losses: number;
  draws: number;
  completedWithoutResult: number;
  /** UTC yyyy-mm-dd → completed match count that calendar day */
  activityByDay: Record<string, number>;
};

export async function getProfileBattleStats(userId: string): Promise<ProfileBattleStats> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: MATCH_STATUS.COMPLETED,
    },
    select: {
      updatedAt: true,
      battleResults: {
        select: { reporterId: true, outcome: true },
        take: 1,
      },
    },
  });

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let recordedTotal = 0;
  const activityByDay: Record<string, number> = {};

  for (const m of matches) {
    const day = m.updatedAt.toISOString().slice(0, 10);
    activityByDay[day] = (activityByDay[day] ?? 0) + 1;

    const br = m.battleResults[0];
    if (!br) continue;
    recordedTotal++;
    let perspective: string;
    if (br.reporterId === userId) {
      perspective = br.outcome;
    } else if (br.outcome === BATTLE_OUTCOME.WIN) {
      perspective = BATTLE_OUTCOME.LOSS;
    } else if (br.outcome === BATTLE_OUTCOME.LOSS) {
      perspective = BATTLE_OUTCOME.WIN;
    } else {
      perspective = BATTLE_OUTCOME.DRAW;
    }
    if (perspective === BATTLE_OUTCOME.WIN) wins++;
    else if (perspective === BATTLE_OUTCOME.LOSS) losses++;
    else draws++;
  }

  return {
    completedTotal: matches.length,
    recordedTotal,
    wins,
    losses,
    draws,
    completedWithoutResult: matches.length - recordedTotal,
    activityByDay,
  };
}

export type ProfileMatchFeedRow = {
  id: string;
  updatedAt: string;
  meetLabel: string;
  otherDisplayName: string;
  otherUserId: string;
  outcomeLabel: string | null;
};

export async function getProfileMatchFeed(
  userId: string,
  take = 15,
): Promise<ProfileMatchFeedRow[]> {
  const rows = await getMatchHistory(userId, take);
  return rows.map((m) => {
    const otherName =
      m.playerAId === userId ? m.playerB.displayName : m.playerA.displayName;
    const otherUserId =
      m.playerAId === userId ? m.playerB.id : m.playerA.id;
    const br = m.battleResults[0];
    let outcomeLabel: string | null = null;
    if (br) {
      if (br.reporterId === userId) {
        outcomeLabel =
          br.outcome === BATTLE_OUTCOME.WIN
            ? "勝利"
            : br.outcome === BATTLE_OUTCOME.LOSS
              ? "敗北"
              : "平手";
      } else {
        outcomeLabel =
          br.outcome === BATTLE_OUTCOME.WIN
            ? "敗北"
            : br.outcome === BATTLE_OUTCOME.LOSS
              ? "勝利"
              : "平手";
      }
    }
    return {
      id: m.id,
      updatedAt: m.updatedAt.toISOString(),
      meetLabel: m.meetLabel,
      otherDisplayName: otherName,
      otherUserId,
      outcomeLabel,
    };
  });
}
