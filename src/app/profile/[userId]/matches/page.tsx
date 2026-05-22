import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProfileMatchesPage } from "@/components/profile/ProfileMatchesPage";
import { getProfileMatchFeed } from "@/lib/queries";
import { PROFILE_ALL_MATCHES } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  if (!user) {
    return { title: "所有約戰 | CardMatch" };
  }

  return {
    title: `${user.displayName} 的所有約戰 | CardMatch`,
    description: `查看 ${user.displayName} 的對戰紀錄`,
  };
}

export default async function UserMatchesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);
  if (Number.isNaN(userId)) notFound();

  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.id === userId) redirect("/profile/matches");

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  if (!profile) notFound();

  const feed = await getProfileMatchFeed(userId, PROFILE_ALL_MATCHES);

  return (
    <ProfileMatchesPage
      feed={feed}
      backHref={`/profile/${userId}`}
      title="所有約戰"
      subtitle={`${profile.displayName} 的已完成對戰紀錄`}
    />
  );
}
