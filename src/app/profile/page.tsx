import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DeckSection } from "@/components/profile/DeckSection";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import {
  getProfileBattleStats,
  getProfileMatchFeed,
} from "@/lib/queries";
import { DECK_VISIBILITY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "個人檔案 | CardMatch",
  description: "查看和管理您的個人檔案與牌組",
};

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
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [full, battleStats, feed] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        decks: { orderBy: { updatedAt: "desc" } },
      },
    }),
    getProfileBattleStats(user.id),
    getProfileMatchFeed(user.id, 15),
  ]);

  if (!full) redirect("/login");

  const deckCount = full.decks.length;
  const publicDeckCount = full.decks.filter(
    (d) => d.visibility === DECK_VISIBILITY.PUBLIC,
  ).length;

  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfileDashboard
        user={{
          displayName: full.displayName,
          bio: full.bio,
          avatarUrl: full.avatarUrl,
          bannerUrl: full.bannerUrl,
          createdAt: full.createdAt.toISOString(),
        }}
        battleStats={battleStats}
        deckCount={deckCount}
        publicDeckCount={publicDeckCount}
        feed={feed}
        decksSlot={<DeckSection decks={full.decks} readOnly />}
      />
    </Suspense>
  );
}
