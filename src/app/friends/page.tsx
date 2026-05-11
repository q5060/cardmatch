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
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">社交</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">好友</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          點擊好友開始聊天。
        </p>
      </header>
      <FriendsClientV2 userId={user.id} friendships={friendships} />
    </div>
  );
}
