import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DeckSection } from "@/components/profile/DeckSection";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { getProfileDashboardData } from "@/lib/queries";
import { DECK_VISIBILITY, PROFILE_ALL_MATCHES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "個人檔案 | CardMatch",
  description: "查看和管理您的個人檔案與牌組",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;

  const [full, profileData] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        decks: { orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] },
      },
    }),
    getProfileDashboardData(user.id, user.id, {
      allMatchesTake: tab === "matches" ? PROFILE_ALL_MATCHES : 0,
    }),
  ]);

  if (!full) redirect("/login");

  const deckCount = full.decks.length;
  const publicDeckCount = full.decks.filter(
    (d) => d.visibility === DECK_VISIBILITY.PUBLIC,
  ).length;

  return (
    <ProfileDashboard
      user={{
        displayName: full.displayName,
        bio: full.bio,
        avatarUrl: full.avatarUrl,
        bannerUrl: full.bannerUrl,
        gender: full.gender,
        age: full.age,
        createdAt: full.createdAt.toISOString(),
      }}
      battleStats={profileData.battleStats}
      deckCount={deckCount}
      publicDeckCount={publicDeckCount}
      recentFeed={profileData.recentFeed}
      allMatches={profileData.allMatches}
      topOpponents={profileData.topOpponents}
      allMatchesHref="/profile?tab=matches"
      decksSlot={<DeckSection decks={full.decks} readOnly />}
    />
  );
}
