import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateProfile } from "@/actions/profile";
import { DeckSection } from "@/components/profile/DeckSection";
import { MeetSpotList } from "@/components/profile/MeetSpotList";
import { SpotPickerForm } from "@/components/profile/SpotPickerForm";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import {
  getProfileBattleStats,
  getProfileMatchFeed,
} from "@/lib/queries";
import { DECK_VISIBILITY } from "@/lib/constants";
import type { MapShopPin } from "@/components/map/MeetMap";

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

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [full, shops, battleStats, feed] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        decks: { orderBy: { updatedAt: "desc" } },
        meetSpots: { orderBy: { updatedAt: "desc" } },
      },
    }),
    prisma.shop.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, lat: true, lng: true, addressNote: true },
    }),
    getProfileBattleStats(user.id),
    getProfileMatchFeed(user.id, 15),
  ]);

  if (!full) redirect("/login");

  const shopsPins = shops as MapShopPin[];
  const deckCount = full.decks.length;
  const publicDeckCount = full.decks.filter(
    (d) => d.visibility === DECK_VISIBILITY.PUBLIC,
  ).length;

  const spotsSlot = (
    <>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        在地圖上點選位置，送出後可選擇是否公開到大廳。
      </p>
      <MeetSpotList spots={full.meetSpots} />
      <div className="card card-hover p-6">
        <SpotPickerForm shops={shopsPins} />
      </div>
    </>
  );

  const settingsSlot = (
    <section className="card card-hover space-y-5 p-6">
      <h2 className="text-lg font-semibold text-foreground">基本資料</h2>
      <form action={updateProfile} className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">顯示名稱</span>
          <input
            name="displayName"
            defaultValue={full.displayName}
            required
            maxLength={40}
            className="input-field mt-2"
          />
        </label>
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">自我介紹</span>
          <textarea
            name="bio"
            defaultValue={full.bio}
            rows={3}
            maxLength={500}
            className="input-field mt-2 min-h-[5rem] resize-y"
          />
        </label>
        <button type="submit" className="btn btn-secondary">
          儲存
        </button>
      </form>
    </section>
  );

  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfileDashboard
        user={{
          displayName: full.displayName,
          bio: full.bio,
          avatarUrl: full.avatarUrl,
          createdAt: full.createdAt.toISOString(),
        }}
        battleStats={battleStats}
        deckCount={deckCount}
        publicDeckCount={publicDeckCount}
        meetSpotCount={full.meetSpots.length}
        feed={feed}
        decksSlot={<DeckSection decks={full.decks} />}
        spotsSlot={spotsSlot}
        settingsSlot={settingsSlot}
      />
    </Suspense>
  );
}
