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

export const metadata: Metadata = {
  title: "對戰 | CardMatch",
  description: "在地圖上發布約戰公告，尋找對手並協調會面",
};

const DEFAULT_LAT = 25.033;
const DEFAULT_LNG = 121.565;

export default async function BattlePage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const user = await getCurrentUser();
  const viewerId = user?.id ?? null;

  const [activeMatch, announcements, myAnnouncement, shops, userPrefs, queueStatus] =
    await Promise.all([
      viewerId ? getActiveMatchForUser(viewerId) : Promise.resolve(null),
      getMapAnnouncements(viewerId),
      viewerId ? getMyActiveAnnouncement(viewerId) : Promise.resolve(null),
      getShops(viewerId),
      viewerId
        ? prisma.user.findUnique({
            where: { id: viewerId },
            select: { defaultShopId: true },
          })
        : Promise.resolve(null),
      viewerId ? getMyQueueStatus() : Promise.resolve(null),
    ]);

  let battleResult = null;
  if (activeMatch && viewerId) {
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

  const { shop: initialShopId } = await searchParams;
  const defaultLat = myAnnouncement?.lat ?? DEFAULT_LAT;
  const defaultLng = myAnnouncement?.lng ?? DEFAULT_LNG;
  return (
    <div className="space-y-4">
      <BattleClient
        userId={viewerId}
        shops={shops}
        announcements={announcements}
        myAnnouncement={myAnnouncement}
        activeMatch={
          activeMatch && viewerId
            ? await toActiveMatchDTO(activeMatch, viewerId)
            : null
        }
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        defaultShopId={userPrefs?.defaultShopId ?? null}
        initialQueueStatus={queueStatus}
        battleResult={battleResult}
        initialShopId={initialShopId ?? null}
      />
    </div>
  );
}
