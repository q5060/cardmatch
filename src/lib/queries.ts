import prisma from "./prisma";
import { MATCH_STATUS } from "./constants";

const ACTIVE = [
  MATCH_STATUS.INVITE_PENDING,
  MATCH_STATUS.ACCEPTED,
  MATCH_STATUS.IN_PROGRESS,
];

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
      user: { select: { id: true, displayName: true } },
    },
  });

  return spots.map((s) => ({
    userId: s.userId,
    displayName: s.user.displayName,
    lat: s.lat,
    lng: s.lng,
    label: s.label,
    timeNote: s.timeNote,
    spotId: s.id,
  }));
}

export async function getActiveMatchForUser(userId: string) {
  return prisma.match.findFirst({
    where: {
      OR: [{ playerAId: userId }, { playerBId: userId }],
      status: { in: ACTIVE },
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
      playerA: { select: { displayName: true } },
      playerB: { select: { displayName: true } },
      battleResults: true,
    },
  });
}

export async function userInQueue(userId: string) {
  return prisma.matchQueueEntry.findUnique({ where: { userId } });
}
