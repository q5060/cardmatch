import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { PublicDeckList } from "@/components/profile/PublicDeckList";
import { getProfileBattleStats, getProfileMatchFeed } from "@/lib/queries";
import { DECK_VISIBILITY } from "@/lib/constants";

function ProfilePageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="h-9 w-48 max-w-full animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="card overflow-hidden p-0">
        <div className="h-32 animate-pulse bg-neutral-200/90" />
        <div className="space-y-4 p-6">
          <div className="flex gap-4">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-neutral-200" />
            <div className="flex-1 space-y-2 pt-2">
              <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-28 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
          <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

export default async function OtherProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.id === userId) redirect("/profile");

  const [profile, battleStats, feed] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        decks: {
          where: { visibility: DECK_VISIBILITY.PUBLIC },
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, notes: true },
        },
      },
    }),
    getProfileBattleStats(userId),
    getProfileMatchFeed(userId, 15),
  ]);

  if (!profile) notFound();

  const deckCount = profile.decks.length;
  const publicDeckCount = deckCount;

  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfileDashboard
        variant="other"
        profileBasePath={`/profile/${userId}`}
        user={{
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          createdAt: profile.createdAt.toISOString(),
        }}
        battleStats={battleStats}
        deckCount={deckCount}
        publicDeckCount={publicDeckCount}
        meetSpotCount={0}
        feed={feed}
        decksSlot={<PublicDeckList decks={profile.decks} />}
      />
    </Suspense>
  );
}
