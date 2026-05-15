import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FriendChatPage } from "@/components/chat/FriendChatPage";

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

  const friendship = await prisma.friendship.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, displayName: true, avatarUrl: true } },
      addressee: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

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

  return (
    <FriendChatPage
      friendshipId={friendship.id}
      currentUserId={user.id}
      otherUser={otherUser}
    />
  );
}
