import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FriendsClientV2 } from "@/components/friends/FriendsClientV2";

export const metadata: Metadata = {
  title: "好友 | CardMatch",
  description: "管理您的好友列表和訊息",
};

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
    include: {
      requester: { select: { id: true, displayName: true, avatarUrl: true } },
      addressee: { select: { id: true, displayName: true, avatarUrl: true } },
      messages: {
        select: { id: true, senderId: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <FriendsClientV2 userId={user.id} friendships={friendships} />
    </div>
  );
}
