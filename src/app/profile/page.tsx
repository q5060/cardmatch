import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateProfile } from "@/actions/profile";
import { DeckSection } from "@/components/profile/DeckSection";
import { MeetSpotList } from "@/components/profile/MeetSpotList";
import { SpotPickerForm } from "@/components/profile/SpotPickerForm";
import { getMatchHistory } from "@/lib/queries";
import type { MapShopPin } from "@/components/map/MeetMap";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      decks: { orderBy: { updatedAt: "desc" } },
      meetSpots: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!full) redirect("/login");

  const history = await getMatchHistory(user.id);
  const shops: MapShopPin[] = await prisma.shop.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, lat: true, lng: true, addressNote: true },
  });

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">個人中心</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          個人檔案
        </h1>
      </header>

      <section className="card card-hover space-y-5 p-6">
        <h2 className="text-lg font-semibold text-foreground">基本資料</h2>
        <form action={updateProfile} className="max-w-xl space-y-4">
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">我的牌組</h2>
        <DeckSection decks={full.decks} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">約戰地點</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          在地圖上點選位置，送出後可選擇是否公開到大廳。
        </p>
        <MeetSpotList spots={full.meetSpots} />
        <div className="card card-hover p-6">
          <SpotPickerForm shops={shops} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">約戰紀錄</h2>
        <ul className="space-y-2">
          {history.length === 0 ? (
            <li className="text-sm text-muted-foreground">尚無已完成對戰。</li>
          ) : (
            history.map((m) => {
              const other =
                m.playerAId === user.id ? m.playerB.displayName : m.playerA.displayName;
              const result = m.battleResults[0];
              return (
                <li key={m.id} className="card card-hover px-4 py-3 text-sm text-foreground shadow-none">
                  vs {other} · {m.meetLabel}
                  {result ? (
                    <span className="ml-2 text-muted-foreground">（戰果已紀錄）</span>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
