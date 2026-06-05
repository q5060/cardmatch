import prisma from "./prisma";
import {
  MATCH_ACTIVE_STATUSES,
  MATCH_STATUS,
} from "./constants";
import {
  announcementDeckInclude,
  matchDeckInclude,
  toDeckSummary,
  canViewDeckContent,
  type DeckSummary,
  type DeckSummaryWithAccess,
} from "./matchDeck";
import { getBlockedUserIds } from "./block";
import { isShopOpenNow, parseShopHours } from "./shopHours";

async function hiddenUserIdsForViewer(viewerId: number | null): Promise<number[]> {
  if (viewerId === null) return [];
  const blocked = await getBlockedUserIds(viewerId);
  return [viewerId, ...blocked];
}

/**
 * Check if two users are friends (mutual accepted friendship)
 */
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

/**
 * Check if user data should be visible based on privacy settings
 * Returns true if the viewer should see the data
 */
async function shouldShowPrivateData(
  targetUserId: number,
  viewerId: number | null,
  visibilitySetting: string,
): Promise<boolean> {
  // If viewing own data, always show
  if (viewerId !== null && viewerId === targetUserId) return true;

  // If no viewer (public access), only show if PUBLIC
  if (!viewerId) return visibilitySetting === "PUBLIC";

  // If PRIVATE, never show to others
  if (visibilitySetting === "PRIVATE") return false;

  // If PUBLIC, always show
  if (visibilitySetting === "PUBLIC") return true;

  // If FRIENDS, check friendship
  if (visibilitySetting === "FRIENDS") {
    return await areFriends(targetUserId, viewerId);
  }

  return false;
}

/**
 * Get reason why data is hidden (for UI messages)
 * Returns null if data is visible or if truly empty
 */
export async function getPrivacyHiddenReason(
  targetUserId: number,
  viewerId: number | null,
  visibilitySetting: string,
): Promise<string | null> {
  // If viewing own data, never hidden
  if (viewerId !== null && viewerId === targetUserId) return null;

  // If no viewer, check
  if (!viewerId) {
    return visibilitySetting === "PUBLIC" ? null : "對戰紀錄未公開";
  }

  // If PRIVATE, show reason
  if (visibilitySetting === "PRIVATE") return "對戰紀錄未公開";

  // If PUBLIC, not hidden
  if (visibilitySetting === "PUBLIC") return null;

  // If FRIENDS, check if friends
  if (visibilitySetting === "FRIENDS") {
    const isFriend = await areFriends(targetUserId, viewerId);
    return isFriend ? null : "對戰紀錄未公開";
  }

  return null;
}

export type ShopEventDTO = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
};

export async function getShops(viewerId: number | null) {
  try {
    const blockedArray =
      viewerId === null ? [] : Array.from(await getBlockedUserIds(viewerId));
    const [shops, counts] = await Promise.all([
      prisma.shop.findMany({ orderBy: { name: "asc" } }),
      prisma.meetSpot.groupBy({
        by: ["shopId"],
        where: {
          ...activeAnnouncementWhere(),
          shopId: { not: null },
          userId: { notIn: blockedArray },  // Only exclude blocked users, include self
        },
        _count: { _all: true },
      }),
    ]);

    const countByShopId = new Map(
      counts
        .filter((row) => row.shopId)
        .map((row) => [row.shopId!, row._count._all]),
    );

    return shops.map((shop) => {
      try {
        const parsedHours = parseShopHours(shop.hoursJson);
        return {
          ...shop,
          lobbyCount: countByShopId.get(shop.id) ?? 0,
          openNow: parsedHours ? isShopOpenNow(parsedHours) : false,
        };
      } catch (err) {
        console.error(`Error processing shop ${shop.id}:`, err);
        return {
          ...shop,
          lobbyCount: countByShopId.get(shop.id) ?? 0,
          openNow: false,
        };
      }
    });
  } catch (err) {
    console.error("Error in getShops:", err);
    return [];
  }
}

export async function getShopRecentEvents(
  shopId: string,
  limit = 5,
): Promise<ShopEventDTO[]> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  if (!prisma || !prisma.shopEvent) {
    console.error("Prisma client not initialized properly");
    return [];
  }
  const events = await prisma.shopEvent.findMany({
    where: {
      shopId,
      startsAt: { gte: cutoff },
    },
    orderBy: { startsAt: "asc" },
    take: limit,
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
  }));
}

function activeAnnouncementWhere() {
  return {
    looking: true,
    active: true,
    expiresAt: { gt: new Date() },
  } as const;
}

export type MapAnnouncementDTO = {
  spotId: string;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  gender: string;
  age: number | null;
  bio: string;
  lat: number;
  lng: number;
  label: string;
  timeNote: string;
  playNote: string;
  playFormat: string;
  shopId: string | null;
  expiresAt: string;
  deck: DeckSummaryWithAccess | null;
};

type SpotWithUser = {
  id: string;
  userId: number;
  lat: number;
  lng: number;
  label: string;
  timeNote: string;
  playNote: string;
  playFormat: string;
  shopId: string | null;
  expiresAt: Date | null;
  deck?: { id: string; title: string; visibility: string } | null;
  user: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
    gender: string;
    age: number | null;
    bio: string;
  };
};

async function mapSpotToDTO(
  s: SpotWithUser,
  viewerId: number | null,
): Promise<MapAnnouncementDTO> {
  const summary = toDeckSummary(s.deck);
  let deck: DeckSummaryWithAccess | null = null;
  if (summary && s.deck) {
    const canViewCards = await canViewDeckContent(
      { userId: s.userId, visibility: s.deck.visibility },
      viewerId,
    );
    deck = { ...summary, canViewCards };
  }

  return {
    spotId: s.id,
    userId: s.userId,
    displayName: s.user.displayName,
    avatarUrl: s.user.avatarUrl,
    gender: s.user.gender,
    age: s.user.age,
    bio: s.user.bio,
    lat: s.lat,
    lng: s.lng,
    label: s.label,
    timeNote: s.timeNote,
    playNote: s.playNote,
    playFormat: s.playFormat,
    shopId: s.shopId,
    expiresAt: s.expiresAt!.toISOString(),
    deck,
  };
}

const userInclude = {
  ...announcementDeckInclude,
  user: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      gender: true,
      age: true,
      bio: true,
    },
  },
} as const;

/** Map announcements including both custom-location and shop-based announcements. Only the latest per user. */
export async function getMapAnnouncements(
  viewerId: number | null,
): Promise<MapAnnouncementDTO[]> {
  const hidden = await hiddenUserIdsForViewer(viewerId);
  
  // Get all active spots, then group by userId and take only the latest for each user
  const allSpots = await prisma.meetSpot.findMany({
    where: {
      ...activeAnnouncementWhere(),
      userId: { notIn: hidden },
    },
    include: userInclude,
    orderBy: { updatedAt: "desc" },
  });

  // Group by userId and keep only the first (latest) one per user
  const latestByUser = new Map<number, typeof allSpots[0]>();
  for (const spot of allSpots) {
    if (!latestByUser.has(spot.userId)) {
      latestByUser.set(spot.userId, spot);
    }
  }

  return Promise.all(
    Array.from(latestByUser.values()).map((s) => mapSpotToDTO(s, viewerId)),
  );
}

export type HomeAnnouncementPreview = {
  userId: number;
  displayName: string;
  label: string;
};

/** Distinct players with an active announcement + up to `limit` most recently updated. */
export async function getHomeAnnouncementStats(limit = 3): Promise<{
  playerCount: number;
  recent: HomeAnnouncementPreview[];
}> {
  const allSpots = await prisma.meetSpot.findMany({
    where: activeAnnouncementWhere(),
    include: userInclude,
    orderBy: { updatedAt: "desc" },
  });

  const latestByUser = new Map<number, (typeof allSpots)[0]>();
  for (const spot of allSpots) {
    if (!latestByUser.has(spot.userId)) {
      latestByUser.set(spot.userId, spot);
    }
  }

  const latest = Array.from(latestByUser.values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  return {
    playerCount: latest.length,
    recent: latest.slice(0, limit).map((s) => ({
      userId: s.userId,
      displayName: s.user.displayName,
      label: s.label,
    })),
  };
}

export async function getAnnouncementsAtShop(
  shopId: string,
  viewerId: number | null,
): Promise<MapAnnouncementDTO[]> {
  const blockedArray =
    viewerId === null ? [] : Array.from(await getBlockedUserIds(viewerId));
  if (!prisma || !prisma.meetSpot) {
    console.error("Prisma client not initialized properly");
    return [];
  }
  const spots = await prisma.meetSpot.findMany({
    where: {
      ...activeAnnouncementWhere(),
      shopId,
      userId: { notIn: blockedArray },
    },
    include: userInclude,
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(spots.map((s) => mapSpotToDTO(s, viewerId)));
}

export async function getMyActiveAnnouncement(
  userId: number,
): Promise<MapAnnouncementDTO | null> {
  const s = await prisma.meetSpot.findFirst({
    where: {
      userId,
      ...activeAnnouncementWhere(),
    },
    include: userInclude,
  });
  if (!s || !s.expiresAt) return null;

  return mapSpotToDTO(s, userId);
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
      playerA: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          gender: true,
          age: true,
        },
      },
      playerB: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          gender: true,
          age: true,
        },
      },
      ...matchDeckInclude,
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
      shop: { select: { id: true, name: true } },
      ...matchDeckInclude,
    },
  });
}

/** Calculate the maximum win streak from battle results */
function calculateMaxWinStreak(
  matches: Array<{
    battleResults: Array<{ winnerId: number | null; status: string }>;
  }>,
  userId: number,
): number {
  // Sort matches by date ascending (oldest first) to calculate streaks
  const sortedMatches = [...matches].reverse();
  
  let maxStreak = 0;
  let currentStreak = 0;

  for (const m of sortedMatches) {
    const br = m.battleResults[0];
    if (!br || br.status !== "AGREED") {
      // Draw or unresolved battle breaks the win streak
      currentStreak = 0;
      continue;
    }

    if (br.winnerId === userId) {
      // Win - increment streak
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // Loss breaks the win streak
      currentStreak = 0;
    }
  }

  return maxStreak;
}

export type ProfileBattleStats = {
  completedTotal: number;
  recordedTotal: number;
  wins: number;
  losses: number;
  draws: number;
  completedWithoutResult: number;
  maxWinStreak: number;
  /** UTC yyyy-mm-dd → completed match count that calendar day */
  activityByDay: Record<string, number>;
  /** Hour (0-23 UTC+8) → completed match count that hour */
  activityByHour: Record<number, number>;
};

export async function getProfileBattleStats(
  userId: number,
  viewerId?: number,
): Promise<ProfileBattleStats> {
  // First, get the user's privacy settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      battleRecordVisibility: true,
      winrateVisibility: true,
    },
  });

  if (!user) {
    return {
      completedTotal: 0,
      recordedTotal: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      maxWinStreak: 0,
      completedWithoutResult: 0,
      activityByDay: {},
      activityByHour: {},
    };
  }

  // Check if viewer can see battle records
  const canSeeBattleRecords = await shouldShowPrivateData(
    userId,
    viewerId ?? null,
    user.battleRecordVisibility,
  );

  // Check if viewer can see win rate
  const canSeeWinrate = await shouldShowPrivateData(
    userId,
    viewerId ?? null,
    user.winrateVisibility,
  );

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
  const activityByHour: Record<number, number> = {};

  // If viewer can see battle records, calculate activity heatmap and hourly activity
  if (canSeeBattleRecords) {
    for (const m of matches) {
      const day = m.updatedAt.toISOString().slice(0, 10);
      activityByDay[day] = (activityByDay[day] ?? 0) + 1;

      // Calculate hour in UTC+8
      const utc8Date = new Date(m.updatedAt.getTime() + 8 * 60 * 60 * 1000);
      const hour = utc8Date.getUTCHours();
      activityByHour[hour] = (activityByHour[hour] ?? 0) + 1;
    }
  }

  // Calculate win/loss/draw stats
  for (const m of matches) {
    const br = m.battleResults[0];
    if (!br || br.status !== "AGREED") continue;
    recordedTotal++;
    if (br.winnerId === userId) {
      wins++;
    } else if (br.winnerId === null) {
      draws++;
    } else {
      losses++;
    }
  }

  // If viewer can't see win rate, hide it
  if (!canSeeWinrate) {
    wins = 0;
    losses = 0;
    draws = 0;
    recordedTotal = 0;
  }

  // Calculate max win streak
  let maxWinStreak = 0;
  if (canSeeWinrate) {
    maxWinStreak = calculateMaxWinStreak(matches, userId);
  }

  return {
    completedTotal: matches.length,
    recordedTotal,
    wins,
    losses,
    draws,
    maxWinStreak,
    completedWithoutResult: matches.length - recordedTotal,
    activityByDay,
    activityByHour,
  };
}

export type ProfileMatchFeedRow = {
  id: number;
  updatedAt: string;
  meetLabel: string;
  meetLat: number;
  meetLng: number;
  shopId: string | null;
  shopName: string | null;
  otherDisplayName: string;
  otherUserId: number;
  outcomeLabel: string | null;
  myDeck: DeckSummary | null;
  otherDeck: DeckSummary | null;
};

export async function getProfileMatchFeed(
  userId: number,
  take = 15,
  viewerId?: number,
): Promise<ProfileMatchFeedRow[]> {
  // First, get the user's privacy settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      battleRecordVisibility: true,
    },
  });

  if (!user) {
    return [];
  }

  // Check if viewer can see battle records
  const canSeeBattleRecords = await shouldShowPrivateData(
    userId,
    viewerId ?? null,
    user.battleRecordVisibility,
  );

  // If viewer can't see battle records, return empty feed
  if (!canSeeBattleRecords) {
    return [];
  }

  const rows = await getMatchHistory(userId, take);
  return rows.map((m) => {
    const otherName =
      m.playerAId === userId ? m.playerB.displayName : m.playerA.displayName;
    const otherUserId =
      m.playerAId === userId ? m.playerB.id : m.playerA.id;
    const br = m.battleResults[0];
    let outcomeLabel: string | null = null;
    if (br && br.status === "AGREED") {
      if (br.winnerId === userId) {
        outcomeLabel = "勝";
      } else if (br.winnerId === null) {
        outcomeLabel = "平";
      } else {
        outcomeLabel = "敗";
      }
    }
    return {
      id: m.id,
      updatedAt: m.updatedAt.toISOString(),
      meetLabel: m.meetLabel,
      meetLat: m.meetLat,
      meetLng: m.meetLng,
      shopId: m.shopId,
      shopName: m.shop?.name ?? null,
      otherDisplayName: otherName,
      otherUserId,
      outcomeLabel,
      myDeck: toDeckSummary(
        m.playerAId === userId ? m.playerADeck : m.playerBDeck,
      ),
      otherDeck: toDeckSummary(
        m.playerAId === userId ? m.playerBDeck : m.playerADeck,
      ),
    };
  });
}

export type TopOpponent = {
  opponentId: number;
  displayName: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
};

export async function getTopOpponents(
  userId: number,
  limit = 5,
  viewerId?: number,
): Promise<TopOpponent[]> {
  // First, get the user's privacy settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      battleRecordVisibility: true,
    },
  });

  if (!user) {
    return [];
  }

  // Check if viewer can see battle records
  const canSeeBattleRecords = await shouldShowPrivateData(
    userId,
    viewerId ?? null,
    user.battleRecordVisibility,
  );

  // If viewer can't see battle records, return empty list
  if (!canSeeBattleRecords) {
    return [];
  }

  // Get all completed matches with battle results
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: MATCH_STATUS.COMPLETED,
    },
    select: {
      playerAId: true,
      playerBId: true,
      playerA: { select: { displayName: true } },
      playerB: { select: { displayName: true } },
      battleResults: true,
    },
  });

  // Aggregate stats by opponent
  const opponentStats: Record<number, TopOpponent> = {};

  for (const m of matches) {
    const br = m.battleResults[0];
    if (!br || br.status !== "AGREED") continue;

    const opponentId = m.playerAId === userId ? m.playerBId : m.playerAId;
    const opponentName =
      m.playerAId === userId ? m.playerB.displayName : m.playerA.displayName;

    if (!opponentStats[opponentId]) {
      opponentStats[opponentId] = {
        opponentId,
        displayName: opponentName,
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
    }

    opponentStats[opponentId].total++;

    if (br.winnerId === userId) {
      opponentStats[opponentId].wins++;
    } else if (br.winnerId === null) {
      opponentStats[opponentId].draws++;
    } else {
      opponentStats[opponentId].losses++;
    }
  }

  // Sort by total matches descending, then return top N
  return Object.values(opponentStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
