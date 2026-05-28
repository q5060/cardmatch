"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MATCH_QUEUE_TTL_MS } from "@/lib/constants";
import { countActiveMatchesForUser } from "@/lib/queries";
import { createInviteMatch } from "@/lib/matchInvite";
import type { MeetLocation } from "@/lib/matchInvite";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

/** Calculate distance in km between two coordinates using Haversine formula */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Calculate if two circles overlap */
function circlesOverlap(
  lat1: number,
  lng1: number,
  r1: number,
  lat2: number,
  lng2: number,
  r2: number,
): boolean {
  const distance = haversineDistance(lat1, lng1, lat2, lng2);
  return distance <= r1 + r2;
}

/** Calculate overlap area of two circles (approximation for small distances) */
function circleOverlapArea(
  lat1: number,
  lng1: number,
  r1: number,
  lat2: number,
  lng2: number,
  r2: number,
): number {
  const d = haversineDistance(lat1, lng1, lat2, lng2);

  // No overlap
  if (d >= r1 + r2) return 0;

  // One circle completely inside the other
  if (d <= Math.abs(r1 - r2)) {
    const smallerRadius = Math.min(r1, r2);
    return Math.PI * smallerRadius * smallerRadius;
  }

  // Partial overlap - lens area formula
  const part1 = (r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1))) || 0;
  const part2 = (r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))) || 0;
  const part3 = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));

  return part1 + part2 - part3;
}

/**
 * Calculate the exact geometric centroid of the lens-shaped intersection of two circles.
 *
 * Derivation (1-D along the C1→C2 axis):
 *   h1 = (d² + r1² − r2²) / (2d)  — distance from C1 to the chord
 *   h2 = d − h1                    — distance from C2 to the chord
 *
 *   Circular segment area:   A = r²·arccos(h/r) − h·√(r²−h²)
 *   Segment centroid from its center (toward the other circle):
 *     cx = (2/3)·(r²−h²)^(3/2) / A
 *
 *   Lens centroid (from C1):
 *     x = (A1·cx1 + A2·(d − cx2)) / A_lens
 *
 *   Finally interpolate in geographic coordinates: t = x / d
 */
function overlapCenter(
  lat1: number,
  lng1: number,
  r1: number,
  lat2: number,
  lng2: number,
  r2: number,
): { lat: number; lng: number } {
  const d = haversineDistance(lat1, lng1, lat2, lng2);

  // Coincident centers → use either center
  if (d === 0) return { lat: lat1, lng: lng1 };

  // One circle completely inside the other → centroid is the smaller circle's center
  if (d <= Math.abs(r1 - r2)) {
    return r1 <= r2 ? { lat: lat1, lng: lng1 } : { lat: lat2, lng: lng2 };
  }

  // Distance from each center to the radical-axis chord
  const h1 = (d * d + r1 * r1 - r2 * r2) / (2 * d);
  const h2 = d - h1;

  // Clamped to avoid floating-point negatives from near-zero sinSq
  const sinSq1 = Math.max(0, r1 * r1 - h1 * h1);
  const sinSq2 = Math.max(0, r2 * r2 - h2 * h2);

  // Circular segment areas (each half of the lens)
  const A1 = r1 * r1 * Math.acos(Math.min(1, h1 / r1)) - h1 * Math.sqrt(sinSq1);
  const A2 = r2 * r2 * Math.acos(Math.min(1, h2 / r2)) - h2 * Math.sqrt(sinSq2);
  const A_lens = A1 + A2;

  if (A_lens <= 0) {
    // Degenerate (circles barely touching) → midpoint
    return { lat: (lat1 + lat2) / 2, lng: (lng1 + lng2) / 2 };
  }

  // Centroid of each segment, measured from its own circle's center toward the other
  const cx1 = A1 > 0 ? (2 / 3) * Math.pow(sinSq1, 1.5) / A1 : 0;
  const cx2 = A2 > 0 ? (2 / 3) * Math.pow(sinSq2, 1.5) / A2 : 0;

  // Lens centroid position from C1 along the C1→C2 axis
  const xCentroid = (A1 * cx1 + A2 * (d - cx2)) / A_lens;

  // Interpolation fraction t ∈ [0, 1] from C1 toward C2
  const t = xCentroid / d;

  return {
    lat: lat1 + (lat2 - lat1) * t,
    lng: lng1 + (lng2 - lng1) * t,
  };
}

async function expireMatchQueueEntries(tx: Prisma.TransactionClient) {
  const cutoff = new Date(Date.now() - MATCH_QUEUE_TTL_MS);
  await tx.matchQueueEntry.deleteMany({
    where: { joinedAt: { lt: cutoff } },
  });
}

async function expireMatchQueueEntriesGlobal() {
  const cutoff = new Date(Date.now() - MATCH_QUEUE_TTL_MS);
  await prisma.matchQueueEntry.deleteMany({
    where: { joinedAt: { lt: cutoff } },
  });
}

type QueueEntry = Prisma.MatchQueueEntryGetPayload<{ include: { shop: true } }>;

/** Find the best partner based on circle overlap (largest overlap area) */
async function findPartnerByOverlap(
  tx: Prisma.TransactionClient,
  joinerId: number,
  joinerLat: number,
  joinerLng: number,
  joinerRadiusKm: number,
) {
  // Get all other players in queue
  const candidates = await tx.matchQueueEntry.findMany({
    where: {
      userId: { not: joinerId },
      lat: { not: null },
      lng: { not: null },
      radiusKm: { not: null },
    },
    include: { shop: true },
    orderBy: { joinedAt: "asc" },
  });

  let bestPartner: QueueEntry | null = null;
  let bestOverlapArea = 0;

  for (const candidate of candidates) {
    if (!candidate.lat || !candidate.lng || !candidate.radiusKm) continue;

    // Check if circles overlap
    if (!circlesOverlap(joinerLat, joinerLng, joinerRadiusKm, candidate.lat, candidate.lng, candidate.radiusKm)) {
      continue;
    }

    // Calculate overlap area
    const overlapArea = circleOverlapArea(
      joinerLat,
      joinerLng,
      joinerRadiusKm,
      candidate.lat,
      candidate.lng,
      candidate.radiusKm,
    );

    // Keep track of largest overlap
    if (overlapArea > bestOverlapArea) {
      bestOverlapArea = overlapArea;
      bestPartner = candidate;
    }
  }

  return bestPartner;
}

async function resolveMeetLocation(
  joinerLat: number,
  joinerLng: number,
  joinerRadiusKm: number,
  waiterLat: number,
  waiterLng: number,
  waiterRadiusKm: number,
): Promise<MeetLocation> {
  // Calculate the center of overlap as the meeting point
  const center = overlapCenter(joinerLat, joinerLng, joinerRadiusKm, waiterLat, waiterLng, waiterRadiusKm);

  return {
    lat: center.lat,
    lng: center.lng,
    label: center.lat.toFixed(5) + ", " + center.lng.toFixed(5),
    shopId: null,
  };
}

export type JoinRandomQueueResult =
  | { status: "matched"; matchId: number }
  | { status: "waiting" };

export async function joinRandomQueue(input?: {
  shopId?: string | null;
  playNote?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}): Promise<JoinRandomQueueResult> {
  const userId = await requireUserId();
  const shopId = input?.shopId?.trim() || null;
  const playNote = (input?.playNote ?? "").trim().slice(0, 500);
  const lat = input?.lat;
  const lng = input?.lng;
  const radiusKm = input?.radiusKm;

  // Validate location parameters for random matching
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) {
    throw new Error("無效的位置或範圍資訊");
  }

  if ((await countActiveMatchesForUser(userId)) > 0) {
    throw new Error("已有進行中的約戰，無法排隊");
  }

  const pairResult = await prisma.$transaction(async (tx) => {
    await expireMatchQueueEntries(tx);

    const already = await tx.matchQueueEntry.findUnique({
      where: { userId },
    });
    if (already) {
      throw new Error("已在配對佇列中，請先取消");
    }

    const partner = await findPartnerByOverlap(tx, userId, lat!, lng!, radiusKm!);

    if (partner) {
      await tx.matchQueueEntry.delete({ where: { id: partner.id } });
      return { paired: true as const, partner, joinerLat: lat, joinerLng: lng, joinerRadiusKm: radiusKm };
    }

    // No partner found - add to queue
    await tx.matchQueueEntry.create({
      data: {
        userId,
        shopId,
        playNote,
        lat,
        lng,
        radiusKm,
      },
    });
    return { paired: false as const };
  });

  if (!pairResult.paired) {
    revalidatePath("/battle");
    return { status: "waiting" };
  }

  // Match found - create match record
  const partner = pairResult.partner;
  if (!partner.lat || !partner.lng || !partner.radiusKm) {
    throw new Error("配對者位置資訊不完整");
  }

  const meet = await resolveMeetLocation(
    pairResult.joinerLat!,
    pairResult.joinerLng!,
    pairResult.joinerRadiusKm!,
    partner.lat,
    partner.lng,
    partner.radiusKm,
  );

  // Cancel the partner's public announcement if they have one
  await prisma.meetSpot.updateMany({
    where: {
      userId: partner.userId,
      looking: true,
    },
    data: {
      looking: false,
    },
  });

  // Cancel the joiner's public announcement if they have one
  await prisma.meetSpot.updateMany({
    where: {
      userId,
      looking: true,
    },
    data: {
      looking: false,
    },
  });

  const match = await createInviteMatch({
    inviterId: userId,
    targetUserId: partner.userId,
    meet,
    source: "random",
  });

  revalidatePath("/battle");
  return { status: "matched", matchId: match.id };
}

export async function leaveRandomQueue() {
  const userId = await requireUserId();
  await prisma.matchQueueEntry.deleteMany({
    where: { userId },
  });
  revalidatePath("/battle");
}

export type QueueStatus =
  | null
  | {
    inQueue: true;
    shopId: string | null;
    shopName: string | null;
    scope: "shop" | "any";
    joinedAt: string;
    /** Saved map-center and radius used when the player joined the random queue */
    lat: number | null;
    lng: number | null;
    radiusKm: number | null;
  };

export async function getMyQueueStatus(): Promise<QueueStatus> {
  const userId = await requireUserId();
  await expireMatchQueueEntriesGlobal();

  const row = await prisma.matchQueueEntry.findUnique({
    where: { userId },
    include: { shop: true },
  });
  if (!row) return null;

  return {
    inQueue: true,
    shopId: row.shopId,
    shopName: row.shop?.name ?? null,
    scope: row.shopId ? "shop" : "any",
    joinedAt: row.joinedAt.toISOString(),
    lat: row.lat,
    lng: row.lng,
    radiusKm: row.radiusKm,
  };
}
