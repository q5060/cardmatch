import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { PublicDeckList } from "@/components/profile/PublicDeckList";
import { getProfileBattleStats, getProfileMatchFeed, getPrivacyHiddenReason, getTopOpponents } from "@/lib/queries";
import { DECK_VISIBILITY, PROFILE_RECENT_MATCHES, PROFILE_ALL_MATCHES } from "@/lib/constants";
import { isBlockedBetween } from "@/lib/block";
import { viewerHasBlocked } from "@/actions/moderation";

export async function generateMetadata(
  { params }: { params: Promise<{ userId: string }> }
): Promise<Metadata> {
  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    
    if (!user) {
      return {
        title: "使用者不存在 | CardMatch",
        description: "此使用者檔案不存在",
      };
    }
    
    return {
      title: `${user.displayName}的檔案 | CardMatch`,
      description: `檢視 ${user.displayName} 的個人檔案、對戰統計和公開牌組`,
    };
  } catch {
    return {
      title: "個人檔案 | CardMatch",
      description: "檢視使用者個人檔案",
    };
  }
}

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
  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr);
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.id === userId) redirect("/profile");

  // First fetch profile info and friendship status
  const [profile, friendship, blockedByViewer, blockedEither] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        createdAt: true,
        battleRecordVisibility: true,
        winrateVisibility: true,
      },
    }),
    prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: viewer.id, addresseeId: userId },
          { requesterId: userId, addresseeId: viewer.id },
        ],
      },
      select: { id: true, status: true, requesterId: true },
    }),
    viewerHasBlocked(viewer.id, userId),
    isBlockedBetween(viewer.id, userId),
  ]);

  if (!profile) notFound();

  // Determine which decks are visible based on friendship and privacy settings
  const isFriend = friendship?.status === "ACCEPTED";
  
  // Get decks based on visibility
  const deckFilters = [];
  deckFilters.push({ visibility: DECK_VISIBILITY.PUBLIC });
  if (isFriend) {
    deckFilters.push({ visibility: DECK_VISIBILITY.FRIENDS });
  }

  const decks = await prisma.deck.findMany({
    where: {
      userId: userId,
      OR: deckFilters,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, notes: true, visibility: true, deckJson: true },
  });

  const friendshipForUi = blockedEither ? null : friendship;

  // Then compute hidden reasons and fetch everything else in parallel
  const [battleStats, recentFeed, allMatches, battleRecordsHiddenReason, winrateHiddenReason, topOpponents] =
    await Promise.all([
    getProfileBattleStats(userId, viewer.id),
    getProfileMatchFeed(userId, PROFILE_RECENT_MATCHES, viewer.id),
    getProfileMatchFeed(userId, PROFILE_ALL_MATCHES, viewer.id),
    getPrivacyHiddenReason(userId, viewer.id, profile.battleRecordVisibility),
    getPrivacyHiddenReason(userId, viewer.id, profile.winrateVisibility),
    getTopOpponents(userId, 5, viewer.id),
  ]);

  const deckCount = decks.length;
  const publicDeckCount = deckCount;

  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfileDashboard
        variant="other"
        profileBasePath={`/profile/${userId}`}
        viewedUserId={userId}
        viewerId={viewer.id}
        friendshipStatus={friendshipForUi}
        blockedByViewer={blockedByViewer}
        interactionBlocked={blockedEither}
        user={{
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          bannerUrl: profile.bannerUrl,
          createdAt: profile.createdAt.toISOString(),
        }}
        battleStats={battleStats}
        battleRecordVisibility={profile.battleRecordVisibility as "PUBLIC" | "FRIENDS" | "PRIVATE"}
        winrateVisibility={profile.winrateVisibility as "PUBLIC" | "FRIENDS" | "PRIVATE"}
        battleRecordsHiddenReason={battleRecordsHiddenReason}
        winrateHiddenReason={winrateHiddenReason}
        deckCount={deckCount}
        publicDeckCount={publicDeckCount}
        recentFeed={recentFeed}
        allMatches={allMatches}
        topOpponents={topOpponents}
        allMatchesHref={`/profile/${userId}/matches`}
        decksSlot={<PublicDeckList decks={decks} viewedUserId={userId} viewerId={viewer.id} />}
      />
    </Suspense>
  );
}
