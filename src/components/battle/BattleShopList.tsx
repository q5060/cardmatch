"use client";

import { Store } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";
import { staggerClass } from "@/lib/motion";

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
      {shops.map((shop, index) => (
        <li key={shop.id} className={staggerClass(index)}>
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
              <span className="mt-1 flex flex-wrap gap-1.5">
                {shop.openNow != null ? (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      shop.openNow
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {shop.openNow ? "營業中" : "休息中"}
                  </span>
                ) : null}
                {shop.hasPtcgBattleArea != null ? (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      shop.hasPtcgBattleArea
                        ? "bg-primary/10 text-primary"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {shop.hasPtcgBattleArea ? "PTCG 對戰區" : "無對戰區"}
                  </span>
                ) : null}
                {shop.lobbyCount != null && shop.lobbyCount > 0 ? (
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {shop.lobbyCount} 人在店
                  </span>
                ) : null}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
