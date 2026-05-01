import prisma from "./prisma";
import { distanceKm, midpoint } from "./geo";
import { MATCH_ACTIVE_STATUSES, MATCH_STATUS } from "./constants";

/** Attempt to pair `userId` with another waiting user within both radii. Returns match id or null. */
export async function tryRandomPair(userId: string): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const me = await tx.matchQueueEntry.findUnique({
      where: { userId },
    });
    if (!me || me.mode !== "RANDOM") return null;

    const candidates = await tx.matchQueueEntry.findMany({
      where: {
        userId: { not: userId },
        mode: "RANDOM",
      },
      orderBy: { createdAt: "asc" },
    });

    let partner: (typeof candidates)[0] | undefined;
    for (const c of candidates) {
      const d = distanceKm(me.lat, me.lng, c.lat, c.lng);
      if (d <= me.radiusKm && d <= c.radiusKm) {
        partner = c;
        break;
      }
    }

    if (!partner) return null;

    const [meActive, partnerActive] = await Promise.all([
      tx.match.count({
        where: {
          OR: [{ playerAId: me.userId }, { playerBId: me.userId }],
          status: { in: MATCH_ACTIVE_STATUSES },
        },
      }),
      tx.match.count({
        where: {
          OR: [{ playerAId: partner.userId }, { playerBId: partner.userId }],
          status: { in: MATCH_ACTIVE_STATUSES },
        },
      }),
    ]);
    if (meActive > 0 || partnerActive > 0) return null;

    const [u1, u2] =
      me.userId < partner.userId
        ? [me.userId, partner.userId]
        : [partner.userId, me.userId];

    const mid = midpoint(me.lat, me.lng, partner.lat, partner.lng);

    await tx.matchQueueEntry.deleteMany({
      where: { userId: { in: [me.userId, partner.userId] } },
    });

    const match = await tx.match.create({
      data: {
        playerAId: u1,
        playerBId: u2,
        invitedById: userId,
        status: MATCH_STATUS.ACCEPTED,
        meetLat: mid.lat,
        meetLng: mid.lng,
        meetLabel: "隨機匹配會面點（中點）",
        playerAReady: false,
        playerBReady: false,
      },
    });

    return match.id;
  });
}
