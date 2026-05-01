import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getActiveMatchForUser,
  getLobbyPeers,
  getShops,
  userInQueue,
} from "@/lib/queries";
import { BattleClient, type ActiveMatchDTO } from "@/components/battle/BattleClient";

function toActiveMatchDTO(m: NonNullable<Awaited<ReturnType<typeof getActiveMatchForUser>>>): ActiveMatchDTO {
  return {
    id: m.id,
    status: m.status,
    invitedById: m.invitedById,
    playerAId: m.playerAId,
    playerBId: m.playerBId,
    playerAReady: m.playerAReady,
    playerBReady: m.playerBReady,
    meetLat: m.meetLat,
    meetLng: m.meetLng,
    meetLabel: m.meetLabel,
    playerA: m.playerA,
    playerB: m.playerB,
  };
}

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [activeMatch, lobbyPeers, shops, queue, spots] = await Promise.all([
    getActiveMatchForUser(user.id),
    getLobbyPeers(user.id),
    getShops(),
    userInQueue(user.id),
    prisma.meetSpot.findMany({
      where: { userId: user.id, active: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
  ]);

  const coord = spots[0];
  const defaultLat = coord?.lat ?? 25.033;
  const defaultLng = coord?.lng ?? 121.565;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">對戰大廳</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">對戰</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          公開大廳邀請或隨機匹配，成功後在此協調會面並聊天。
        </p>
      </header>
      {!coord ? (
        <div
          className="card border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/50 px-4 py-4 text-sm text-amber-950 shadow-sm"
          role="status"
        >
          <p className="font-medium">尚未設定約戰座標</p>
          <p className="mt-1 text-amber-900/90">
            請先到「個人檔案」新增至少一個約戰地點，才能使用隨機匹配（座標預設為台北）。
          </p>
        </div>
      ) : null}
      <BattleClient
        userId={user.id}
        shops={shops}
        lobbyPeers={lobbyPeers}
        activeMatch={activeMatch ? toActiveMatchDTO(activeMatch) : null}
        inQueue={!!queue && queue.mode === "RANDOM"}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
      />
    </div>
  );
}
