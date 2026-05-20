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
import { getMyQueueStatus } from "@/actions/matchQueue";
import { BattleClient } from "@/components/battle/BattleClient";
import { toActiveMatchDTO } from "@/lib/matchDto";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "對戰 | CardMatch",
  description: "在地圖上發布約戰公告，尋找對手並協調會面",
};

const DEFAULT_LAT = 25.033;
const DEFAULT_LNG = 121.565;

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [activeMatch, announcements, myAnnouncement, shops, userPrefs, queueStatus] =
    await Promise.all([
    getActiveMatchForUser(user.id),
    getMapAnnouncements(user.id),
    getMyActiveAnnouncement(user.id),
    getShops(),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultShopId: true },
    }),
    getMyQueueStatus(),
  ]);

  let battleResult = null;
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
    <div className="space-y-4">
      <PageHeader title="對戰" />
      <BattleClient
        userId={user.id}
        shops={shops}
        announcements={announcements}
        myAnnouncement={myAnnouncement}
        activeMatch={activeMatch ? toActiveMatchDTO(activeMatch) : null}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        defaultShopId={userPrefs?.defaultShopId ?? null}
        initialQueueStatus={queueStatus}
        battleResult={battleResult}
      />
    </div>
  );
}
