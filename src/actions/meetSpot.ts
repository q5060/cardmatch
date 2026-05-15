"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ANNOUNCEMENT_TTL_HOURS } from "@/lib/constants";
import {
  countActiveMatchesForUser,
  getAnnouncementsAtShop,
  type MapAnnouncementDTO,
} from "@/lib/queries";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

function announcementExpiresAt() {
  return new Date(Date.now() + ANNOUNCEMENT_TTL_HOURS * 60 * 60 * 1000);
}

export async function publishBattleAnnouncement(input: {
  lat: number;
  lng: number;
  label: string;
  timeNote?: string;
  shopId?: string | null;
}) {
  const userId = await requireUserId();

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error("請選擇有效的地圖座標");
  }
  const label = input.label.trim();
  if (!label) throw new Error("請輸入地點名稱");
  const timeNote = (input.timeNote ?? "").trim().slice(0, 500);

  if ((await countActiveMatchesForUser(userId)) > 0) {
    throw new Error("已有進行中的約戰，無法發布公告");
  }

  const expiresAt = announcementExpiresAt();

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
          timeNote,
          shopId: input.shopId ?? null,
          looking: true,
          active: true,
          expiresAt,
        },
      });
    } else {
      await tx.meetSpot.create({
        data: {
          userId,
          lat: input.lat,
          lng: input.lng,
          label: label.slice(0, 120),
          timeNote,
          shopId: input.shopId ?? null,
          looking: true,
          active: true,
          expiresAt,
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

export async function fetchShopLobby(shopId: string): Promise<MapAnnouncementDTO[]> {
  await requireUserId();
  if (!shopId) throw new Error("無效的卡店");
  return getAnnouncementsAtShop(shopId);
}
