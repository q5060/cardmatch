"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MATCH_ACTIVE_STATUSES } from "@/lib/constants";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

export async function blockUser(blockedId: number, note?: string) {
  const blockerId = await requireUserId();
  if (blockerId === blockedId) throw new Error("不能封鎖自己");

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });

  if (existing?.active) throw new Error("已封鎖此用戶");

  if (existing && !existing.active && existing.unblockedAt) {
    const cooldownEnd = new Date(existing.unblockedAt.getTime() + 10 * 60 * 1000);
    if (new Date() < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000);
      throw new Error(`請等待 ${remaining} 分鐘後才能重新封鎖此用戶`);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.block.update({
        where: { id: existing.id },
        data: { active: true, note: note?.trim() || null, unblockedAt: null, createdAt: new Date() },
      });
    } else {
      await tx.block.create({
        data: { blockerId, blockedId, note: note?.trim() || null },
      });
    }

    await tx.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ],
      },
    });

    await tx.match.updateMany({
      where: {
        status: { in: MATCH_ACTIVE_STATUSES },
        OR: [
          { playerAId: blockerId, playerBId: blockedId },
          { playerAId: blockedId, playerBId: blockerId },
        ],
      },
      data: { status: "CANCELLED" },
    });

    await tx.notification.deleteMany({
      where: {
        OR: [
          { userId: blockerId, senderId: blockedId },
          { userId: blockedId, senderId: blockerId },
        ],
      },
    });
  });

  revalidatePath(`/profile/${blockedId}`);
  revalidatePath("/profile");
  revalidatePath("/battle");
  revalidatePath("/friends");
}

export async function unblockUser(blockedId: number) {
  const blockerId = await requireUserId();

  await prisma.block.update({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    data: { active: false, unblockedAt: new Date() },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${blockedId}`);
}

export type BlockListItem = {
  id: string;
  blockedId: number;
  displayName: string;
  avatarUrl: string | null;
  note: string | null;
  createdAt: string;
};

export async function getBlockList(): Promise<BlockListItem[]> {
  const blockerId = await requireUserId();

  const blocks = await prisma.block.findMany({
    where: { blockerId, active: true },
    include: {
      blocked: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return blocks.map((b) => ({
    id: b.id,
    blockedId: b.blockedId,
    displayName: b.blocked.displayName,
    avatarUrl: b.blocked.avatarUrl,
    note: b.note,
    createdAt: b.createdAt.toISOString(),
  }));
}
