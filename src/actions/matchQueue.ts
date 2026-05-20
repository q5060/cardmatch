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

async function findPartner(
  tx: Prisma.TransactionClient,
  joinerId: number,
  joinerShopId: string | null,
) {
  if (joinerShopId) {
    const sameShop = await tx.matchQueueEntry.findFirst({
      where: {
        userId: { not: joinerId },
        shopId: joinerShopId,
      },
      orderBy: { joinedAt: "asc" },
      include: { shop: true },
    });
    if (sameShop) return sameShop;
  }

  return tx.matchQueueEntry.findFirst({
    where: { userId: { not: joinerId } },
    orderBy: { joinedAt: "asc" },
    include: { shop: true },
  });
}

async function resolveMeetLocation(waiter: QueueEntry, joinerShopId: string | null): Promise<MeetLocation> {
  const w = waiter.shopId;
  const j = joinerShopId;
  if (w && j && w === j) {
    const shop = await prisma.shop.findUnique({ where: { id: w } });
    if (shop) {
      return { lat: shop.lat, lng: shop.lng, label: shop.name, shopId: shop.id };
    }
  }

  if (waiter.shopId) {
    const shop = await prisma.shop.findUnique({ where: { id: waiter.shopId } });
    if (shop) {
      return { lat: shop.lat, lng: shop.lng, label: shop.name, shopId: shop.id };
    }
  }

  if (joinerShopId) {
    const shop = await prisma.shop.findUnique({ where: { id: joinerShopId } });
    if (shop) {
      return { lat: shop.lat, lng: shop.lng, label: shop.name, shopId: shop.id };
    }
  }

  const first = await prisma.shop.findFirst({ orderBy: { name: "asc" } });
  if (!first) throw new Error("系統中沒有可用的卡店資料");
  return { lat: first.lat, lng: first.lng, label: first.name, shopId: first.id };
}

export type JoinRandomQueueResult =
  | { status: "matched"; matchId: number }
  | { status: "waiting" };

export async function joinRandomQueue(input?: {
  shopId?: string | null;
  playNote?: string;
}): Promise<JoinRandomQueueResult> {
  const userId = await requireUserId();
  const shopId = input?.shopId?.trim() || null;
  const playNote = (input?.playNote ?? "").trim().slice(0, 500);

  if ((await countActiveMatchesForUser(userId)) > 0) {
    throw new Error("已有進行中的約戰，無法排隊");
  }

  if (shopId) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new Error("找不到指定的卡店");
  }

  const pairResult = await prisma.$transaction(async (tx) => {
    await expireMatchQueueEntries(tx);

    const already = await tx.matchQueueEntry.findUnique({
      where: { userId },
    });
    if (already) {
      throw new Error("已在配對佇列中，請先取消");
    }

    const partner = await findPartner(tx, userId, shopId);

    if (partner) {
      await tx.matchQueueEntry.delete({ where: { id: partner.id } });
      return { paired: true as const, partner, joinerShopId: shopId };
    }

    await tx.matchQueueEntry.create({
      data: {
        userId,
        shopId,
        playNote,
      },
    });
    return { paired: false as const };
  });

  if (!pairResult.paired) {
    revalidatePath("/battle");
    return { status: "waiting" };
  }

  const meet = await resolveMeetLocation(pairResult.partner, pairResult.joinerShopId);

  const match = await createInviteMatch({
    inviterId: userId,
    targetUserId: pairResult.partner.userId,
    meet,
    source: "random",
  });

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
  };
}
