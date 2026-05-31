"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { publishNotification } from "@/lib/realtime/publish";
import { assertNotBlocked } from "@/lib/block";

async function requireUserId(): Promise<number> {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");
  return session.userId;
}

export async function acceptFriendship(friendshipId: string) {
  const userId = await requireUserId();
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f || f.addresseeId !== userId) throw new Error("NOT_FOUND");

  await assertNotBlocked(userId, f.requesterId);

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

  const f = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: { requester: { select: { displayName: true } }, addressee: { select: { displayName: true } } },
  });
  if (!f || f.status !== "ACCEPTED") throw new Error("NOT_FOUND");
  if (f.requesterId !== userId && f.addresseeId !== userId) {
    throw new Error("FORBIDDEN");
  }

  const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
  await assertNotBlocked(userId, otherId);

  await prisma.friendMessage.create({
    data: {
      friendshipId,
      senderId: userId,
      body: text.slice(0, 4000),
    },
  });

  // Send notification to the other user
  const receiverId = f.requesterId === userId ? f.addresseeId : f.requesterId;
  const senderName = f.requesterId === userId ? f.requester.displayName : f.addressee.displayName;
  
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "MESSAGE",
      referenceId: friendshipId,
      senderId: userId,
      data: JSON.stringify(`${senderName} 傳來一條私訊`),
      read: false,
    },
  });

  await publishNotification(receiverId);
  revalidatePath("/friends");
}
