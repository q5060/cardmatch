"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");
  return session.userId;
}

export async function acceptFriendship(friendshipId: string) {
  const userId = await requireUserId();
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f || f.addresseeId !== userId) throw new Error("NOT_FOUND");

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "ACCEPTED" },
  });

  revalidatePath("/friends");
}

export async function rejectFriendship(friendshipId: string) {
  const userId = await requireUserId();
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f || (f.addresseeId !== userId && f.requesterId !== userId)) {
    throw new Error("NOT_FOUND");
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });

  revalidatePath("/friends");
}

export async function sendFriendMessage(friendshipId: string, body: string) {
  const userId = await requireUserId();
  const text = body.trim();
  if (!text) throw new Error("EMPTY");

  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f || f.status !== "ACCEPTED") throw new Error("NOT_FOUND");
  if (f.requesterId !== userId && f.addresseeId !== userId) {
    throw new Error("FORBIDDEN");
  }

  await prisma.friendMessage.create({
    data: {
      friendshipId,
      senderId: userId,
      body: text.slice(0, 4000),
    },
  });

  revalidatePath("/friends");
}
