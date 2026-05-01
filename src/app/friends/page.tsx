import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FriendsClient } from "@/components/friends/FriendsClient";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
    include: {
      requester: { select: { id: true, displayName: true } },
      addressee: { select: { id: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">社交</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">好友</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          管理好友邀請；接受後可在此私訊（輪詢更新）。
        </p>
      </header>
      <FriendsClient userId={user.id} friendships={friendships} />
    </div>
  );
}
