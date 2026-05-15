import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getActiveMatchForUser,
  getMapAnnouncements,
  getMyActiveAnnouncement,
  getShops,
} from "@/lib/queries";
import { BattleClient, type ActiveMatchDTO } from "@/components/battle/BattleClient";

export const metadata: Metadata = {
  title: "對戰 | CardMatch",
  description: "在地圖上發布約戰公告，尋找對手並協調會面",
};

function toActiveMatchDTO(m: NonNullable<Awaited<ReturnType<typeof getActiveMatchForUser>>>): ActiveMatchDTO {
  return {
    id: m.id,
    status: m.status,
    invitedById: m.invitedById,
    playerAId: m.playerAId,
    playerBId: m.playerBId,
    playerAReady: m.playerAReady,
    playerBReady: m.playerBReady,
    cancelRequestedBy: m.cancelRequestedBy,
    meetLat: m.meetLat,
    meetLng: m.meetLng,
    meetLabel: m.meetLabel,
    playerA: m.playerA,
    playerB: m.playerB,
  };
}

export type BattleResultDTO = {
  id: string;
  matchId: number;
  winnerId: number | null;
  playerAAgreed: boolean;
  playerBAgreed: boolean;
  status: string;
} | null;

const DEFAULT_LAT = 25.033;
const DEFAULT_LNG = 121.565;

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [activeMatch, announcements, myAnnouncement, shops] = await Promise.all([
    getActiveMatchForUser(user.id),
    getMapAnnouncements(user.id),
    getMyActiveAnnouncement(user.id),
    getShops(),
  ]);

  let battleResult: BattleResultDTO = null;
  if (activeMatch) {
    const result = await prisma.battleResult.findUnique({
      where: { matchId: activeMatch.id },
    });
    if (result) {
      battleResult = {
        id: result.id,
        matchId: result.matchId,
        winnerId: result.winnerId,
        playerAAgreed: result.playerAAgreed,
        playerBAgreed: result.playerBAgreed,
        status: result.status,
      };
    }
  }

  const defaultLat = myAnnouncement?.lat ?? DEFAULT_LAT;
  const defaultLng = myAnnouncement?.lng ?? DEFAULT_LNG;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">對戰大廳</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">對戰</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          可用搜尋欄找卡店或地址。藍色釘進入店家大廳；綠色釘為玩家自選地點。點擊查看約戰需求並發起邀請，接受後在此協調會面。
        </p>
      </header>
      <BattleClient
        userId={user.id}
        shops={shops}
        announcements={announcements}
        myAnnouncement={myAnnouncement}
        activeMatch={activeMatch ? toActiveMatchDTO(activeMatch) : null}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        battleResult={battleResult}
      />
    </div>
  );
}
