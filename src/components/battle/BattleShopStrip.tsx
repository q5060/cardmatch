"use client";

import { Store } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";

type Props = {
  shops: MapShopPin[];
  onSelectShop: (shop: MapShopPin) => void;
};

export function BattleShopStrip({ shops, onSelectShop }: Props) {
  if (shops.length === 0) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {shops.map((shop) => (
        <button
          key={shop.id}
          type="button"
          onClick={() => onSelectShop(shop)}
          aria-label={shop.name}
          className="card card-hover flex w-[11.5rem] shrink-0 flex-col gap-1.5 rounded-xl p-3 text-left transition hover:border-primary/40"
        >
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Store className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            <span className="line-clamp-1">{shop.name}</span>
          </span>
          {shop.addressNote ? (
            <span className="line-clamp-2 text-xs text-muted-foreground">{shop.addressNote}</span>
          ) : null}
          {shop.lobbyCount != null && shop.lobbyCount > 0 ? (
            <span className="text-xs font-medium text-primary">{shop.lobbyCount} 人</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
