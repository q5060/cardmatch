import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FriendChatPage } from "@/components/chat/FriendChatPage";
import { isBlockedBetween } from "@/lib/block";

export const metadata: Metadata = {
  title: "私訊 | CardMatch",
  description: "與好友進行私訊對話",
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  let friendship = await prisma.friendship.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, displayName: true, avatarUrl: true } },
      addressee: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  // If not found as friendship ID, try parsing as user ID
  if (!friendship) {
    const userId = parseInt(id);
    if (!isNaN(userId)) {
      // Find the most recent friendship with this user (in either direction)
      friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: userId, addresseeId: user.id },
            { requesterId: user.id, addresseeId: userId },
          ],
        },
        include: {
          requester: { select: { id: true, displayName: true, avatarUrl: true } },
          addressee: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      // If friendship found, redirect to the correct friendship ID URL
      if (friendship) {
        redirect(`/chat/${friendship.id}`);
      }
    }
  }

  if (
    !friendship ||
    friendship.status !== "ACCEPTED" ||
    (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)
  ) {
    redirect("/friends");
  }

  const otherUser =
    friendship.requesterId === user.id
      ? friendship.addressee
      : friendship.requester;

  if (await isBlockedBetween(user.id, otherUser.id)) {
    redirect("/friends");
  }

  return (
    <FriendChatPage
      friendshipId={friendship.id}
      currentUserId={user.id}
      otherUser={otherUser}
    />
  );
}
