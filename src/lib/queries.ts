import prisma from "./prisma";
import {
  BATTLE_OUTCOME,
  MATCH_ACTIVE_STATUSES,
  MATCH_STATUS,
} from "./constants";

export async function getShops() {
  return prisma.shop.findMany({ orderBy: { name: "asc" } });
}

const activeAnnouncementWhere = {
  looking: true,
  active: true,
  expiresAt: { gt: new Date() },
} as const;

export type MapAnnouncementDTO = {
  spotId: string;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  lat: number;
  lng: number;
  label: string;
  timeNote: string;
  playNote: string;
  shopId: string | null;
  expiresAt: string;
};

type SpotWithUser = {
  id: string;
  userId: number;
  lat: number;
  lng: number;
  label: string;
  timeNote: string;
  playNote: string;
  shopId: string | null;
  expiresAt: Date | null;
  user: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
    bio: string;
  };
};

function mapSpotToDTO(s: SpotWithUser): MapAnnouncementDTO {
  return {
    spotId: s.id,
    userId: s.userId,
    displayName: s.user.displayName,
    avatarUrl: s.user.avatarUrl,
    bio: s.user.bio,
    lat: s.lat,
    lng: s.lng,
    label: s.label,
    timeNote: s.timeNote,
    playNote: s.playNote,
    shopId: s.shopId,
    expiresAt: s.expiresAt!.toISOString(),
  };
}

const userInclude = {
  user: {
    select: { id: true, displayName: true, avatarUrl: true, bio: true },
  },
} as const;

/** Custom-location announcements only (green campfire pins on map). */
export async function getMapAnnouncements(
  excludeUserId: number,
): Promise<MapAnnouncementDTO[]> {
  const spots = await prisma.meetSpot.findMany({
    where: {
      ...activeAnnouncementWhere,
      shopId: null,
      userId: { not: excludeUserId },
    },
    include: userInclude,
  });

  return spots.map(mapSpotToDTO);
}

export async function getAnnouncementsAtShop(
  shopId: string,
): Promise<MapAnnouncementDTO[]> {
  const spots = await prisma.meetSpot.findMany({
    where: {
      ...activeAnnouncementWhere,
      shopId,
    },
    include: userInclude,
    orderBy: { updatedAt: "desc" },
  });

  return spots.map(mapSpotToDTO);
}

export async function getMyActiveAnnouncement(
  userId: number,
): Promise<MapAnnouncementDTO | null> {
  const s = await prisma.meetSpot.findFirst({
    where: {
      userId,
      ...activeAnnouncementWhere,
    },
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true, bio: true },
      },
    },
  });
  if (!s || !s.expiresAt) return null;

  return mapSpotToDTO(s);
}

/** Active lobby/battle rows involving this user (excludes completed/cancelled). */
export async function countActiveMatchesForUser(userId: number, excludeMatchId?: string) {
  return prisma.match.count({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: { in: MATCH_ACTIVE_STATUSES },
      ...(excludeMatchId ? { NOT: { id: parseInt(excludeMatchId) } } : {}),
    },
  });
}

export async function getActiveMatchForUser(userId: number) {
  return prisma.match.findFirst({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: { in: MATCH_ACTIVE_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      playerA: { select: { id: true, displayName: true, avatarUrl: true } },
      playerB: { select: { id: true, displayName: true, avatarUrl: true } },
      shop: true,
    },
  });
}

export async function getMatchHistory(userId: number, take = 15) {
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

export async function getProfileBattleStats(userId: number): Promise<ProfileBattleStats> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: MATCH_STATUS.COMPLETED,
    },
    select: {
      updatedAt: true,
      battleResults: true,
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
    if (!br || br.status !== "AGREED") continue;
    recordedTotal++;
    if (br.winnerId === userId) {
      wins++;
    } else {
      losses++;
    }
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
  id: number;
  updatedAt: string;
  meetLabel: string;
  otherDisplayName: string;
  otherUserId: number;
  outcomeLabel: string | null;
};

export async function getProfileMatchFeed(
  userId: number,
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
    if (br && br.status === "AGREED") {
      outcomeLabel = br.winnerId === userId ? "勝" : "敗";
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
