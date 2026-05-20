"use client";

import { MapLocationSearch } from "@/components/map/MapLocationSearch";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { BattleNearbyPlayersList } from "@/components/battle/BattleNearbyPlayersList";
import { BattleShopList } from "@/components/battle/BattleShopList";

type Props = {
  shops: MapShopPin[];
  announcements: MapAnnouncementDTO[];
  hideShopList: boolean;
  onSelectShop: (shop: MapShopPin) => void;
  onSelectPlace: (place: { lat: number; lng: number; label: string }) => void;
  onSelectAnnouncement: (announcement: MapAnnouncementDTO) => void;
};

export function BattleShopExploreCard({
  shops,
  announcements,
  hideShopList,
  onSelectShop,
  onSelectPlace,
  onSelectAnnouncement,
}: Props) {
  const showPlayers = announcements.length > 0;

  return (
    <div className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4">
      <h2 className="text-base font-semibold text-foreground">
        {showPlayers ? "附近玩家" : "店家列表"}
      </h2>

      <MapLocationSearch
        shops={shops}
        onSelectShop={onSelectShop}
        onSelectPlace={onSelectPlace}
      />

      {showPlayers ? (
        <BattleNearbyPlayersList announcements={announcements} onSelect={onSelectAnnouncement} />
      ) : hideShopList ? null : (
        <BattleShopList shops={shops} onSelectShop={onSelectShop} />
      )}
    </div>
  );
}
