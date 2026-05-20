"use client";

import type { MapAnnouncementDTO } from "@/lib/queries";
import type { MapShopPin } from "@/components/map/MeetMap";

type Props = {
  announcement: MapAnnouncementDTO;
  shops: MapShopPin[];
  pending: boolean;
  onViewLobby: (shop: MapShopPin) => void;
  onClear: () => void;
};

export function BattleMyAnnouncementBar({
  announcement,
  shops,
  pending,
  onViewLobby,
  onClear,
}: Props) {
  const shop = announcement.shopId
    ? shops.find((s) => s.id === announcement.shopId)
    : null;

  return (
    <div className="card card-hover flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 text-sm">
        <p className="font-medium text-foreground">
          公告中 · {announcement.label}
          <span className="ml-1.5 font-normal text-muted-foreground">
            {announcement.shopId ? "卡店" : "自訂地點"}
          </span>
        </p>
        {announcement.playNote ? (
          <p className="mt-1 line-clamp-2 text-xs text-foreground">{announcement.playNote}</p>
        ) : null}
        {announcement.timeNote ? (
          <p className="mt-0.5 text-xs text-muted-foreground">時段：{announcement.timeNote}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {shop ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onViewLobby(shop)}
          >
            查看大廳
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={onClear}
          className="btn btn-outline btn-sm"
        >
          結束公告
        </button>
      </div>
    </div>
  );
}
