"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  ANNOUNCEMENT_TTL_DEFAULT_HOURS,
  ANNOUNCEMENT_TTL_MAX_HOURS,
  ANNOUNCEMENT_TTL_MIN_HOURS,
} from "@/lib/constants";
import { assertUserOwnsDeck } from "@/lib/matchDeck";
import {
  countActiveMatchesForUser,
  getAnnouncementsAtShop,
  getShopRecentEvents,
  getShops,
  type MapAnnouncementDTO,
  type ShopEventDTO,
} from "@/lib/queries";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

function normalizeTtlHours(raw: number | undefined): number {
  const hours = raw ?? ANNOUNCEMENT_TTL_DEFAULT_HOURS;
  if (!Number.isFinite(hours) || !Number.isInteger(hours)) {
    throw new Error("請輸入有效的公告時長（整數小時）");
  }
  if (hours < ANNOUNCEMENT_TTL_MIN_HOURS || hours > ANNOUNCEMENT_TTL_MAX_HOURS) {
    throw new Error(
      `公告時長須為 ${ANNOUNCEMENT_TTL_MIN_HOURS}–${ANNOUNCEMENT_TTL_MAX_HOURS} 小時`,
    );
  }
  return hours;
}

function announcementExpiresAt(ttlHours: number) {
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
}

export async function publishBattleAnnouncement(input: {
  lat: number;
  lng: number;
  label: string;
  playNote?: string;
  shopId?: string | null;
  ttlHours?: number;
  deckId?: string | null;
}) {
  const userId = await requireUserId();
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error("請選擇有效的地圖座標");
  }
  const label = input.label.trim();
  if (!label) throw new Error("請輸入地點名稱");
  const playNote = (input.playNote ?? "").trim().slice(0, 500);
  const ttlHours = normalizeTtlHours(input.ttlHours);

  if ((await countActiveMatchesForUser(userId)) > 0) {
    throw new Error("已有進行中的約戰，無法發布公告");
  }

  const expiresAt = announcementExpiresAt(ttlHours);
  let deckId: string | null = input.deckId?.trim() || null;
  if (deckId) {
    await assertUserOwnsDeck(userId, deckId);
  } else {
    deckId = null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.meetSpot.updateMany({
      where: { userId },
      data: { looking: false },
    });

    const existing = await tx.meetSpot.findFirst({
      where: { userId, active: true },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      await tx.meetSpot.update({
        where: { id: existing.id },
        data: {
          lat: input.lat,
          lng: input.lng,
          label: label.slice(0, 120),
          timeNote: "",
          playNote,
          shopId: input.shopId ?? null,
          looking: true,
          active: true,
          expiresAt,
          deckId,
        },
      });
    } else {
      await tx.meetSpot.create({
        data: {
          userId,
          lat: input.lat,
          lng: input.lng,
          label: label.slice(0, 120),
          timeNote: "",
          playNote,
          shopId: input.shopId ?? null,
          looking: true,
          active: true,
          expiresAt,
          deckId,
        },
      });
    }
  });

  revalidatePath("/battle");
}

export async function clearBattleAnnouncement() {
  const userId = await requireUserId();

  await prisma.meetSpot.updateMany({
    where: { userId, looking: true },
    data: { looking: false },
  });

  revalidatePath("/battle");
}

export async function fetchShopLobby(shopId: string): Promise<{
  players: MapAnnouncementDTO[];
  events: ShopEventDTO[];
}> {
  try {
    if (!shopId) throw new Error("無效的卡店");
    const session = await getSession();
    const viewerId = session.userId ?? null;
    const [players, events] = await Promise.all([
      getAnnouncementsAtShop(shopId, viewerId),
      getShopRecentEvents(shopId),
    ]);
    return { players, events };
  } catch (error) {
    console.error("fetchShopLobby error:", error);
    throw error;
  }
}

export async function refreshShops() {
  const session = await getSession();
  return getShops(session.userId ?? null);
}
