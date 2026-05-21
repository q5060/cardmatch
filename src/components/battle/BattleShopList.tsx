"use client";

import { Store } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";

type Props = {
  shops: MapShopPin[];
  onSelectShop: (shop: MapShopPin) => void;
};

export function BattleShopList({ shops, onSelectShop }: Props) {
  return (
    <ul
      className="min-h-[352px] space-y-2 overflow-y-auto overscroll-contain pr-0.5"
      role="list"
      style={{ minHeight: "calc(3 * 110px + 16px)" }} // 3 items * ~110px each + gaps
    >
      {shops.map((shop) => (
        <li key={shop.id}>
          <button
            type="button"
            onClick={() => onSelectShop(shop)}
            className="flex w-full items-start gap-3 rounded-xl border border-border/80 bg-card p-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.03]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">{shop.name}</span>
              {shop.addressNote ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{shop.addressNote}</span>
              ) : null}
              {shop.lobbyCount != null && shop.lobbyCount > 0 ? (
                <span className="mt-1 block text-xs font-medium text-primary">
                  {shop.lobbyCount} 人在店
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
