"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

export async function reportUser(reportedId: number, reason?: string) {
  const reporterId = await requireUserId();
  if (reporterId === reportedId) throw new Error("無法檢舉自己");

  const trimmed = (reason ?? "").trim().slice(0, 500);

  await prisma.userReport.create({
    data: {
      reporterId,
      reportedId,
      reason: trimmed,
    },
  });
}

export async function blockUser(blockedId: number) {
  const blockerId = await requireUserId();
  if (blockerId === blockedId) throw new Error("無法封鎖自己");

  await prisma.$transaction(async (tx) => {
    await tx.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });

    await tx.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ],
      },
    });
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${blockedId}`);
  revalidatePath("/friends");
  revalidatePath("/battle");
  revalidatePath("/settings");
}

export async function unblockUser(blockedId: number) {
  const blockerId = await requireUserId();
  if (blockerId === blockedId) throw new Error("無法對自己操作");

  await prisma.userBlock.deleteMany({
    where: { blockerId, blockedId },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${blockedId}`);
  revalidatePath("/friends");
  revalidatePath("/battle");
  revalidatePath("/settings");
}

export async function viewerHasBlocked(
  viewerId: number,
  otherId: number,
): Promise<boolean> {
  const row = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: viewerId, blockedId: otherId },
    },
    select: { blockerId: true },
  });
  return row != null;
}
