"use client";

import type { ReactNode } from "react";

type Props = {
  matchSetup: ReactNode | null;
  shopExplore: ReactNode;
  map: ReactNode;
  sheetOpen: boolean;
  sheets: ReactNode;
};

export function BattleExplorePanel({
  matchSetup,
  shopExplore,
  map,
  sheetOpen,
  sheets,
}: Props) {
  /* Two columns always on lg so the map never shrinks when a sheet opens. Sheets float over the map. */
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:h-full">
        {matchSetup}
        {shopExplore}
        <div className="hidden min-h-0 flex-1 lg:block" aria-hidden />
      </div>

      <div className="card relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl p-0 lg:h-full lg:min-h-0">
        {/* Map fills the card; overlays sit on top */}
        <div className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden lg:min-h-0">
          <div className="min-h-0 flex flex-1 flex-col">{map}</div>
          {sheetOpen ? (
            <div className="pointer-events-none absolute inset-0 z-[1100] flex items-stretch justify-end p-2 sm:p-2">
              <div className="pointer-events-auto flex h-full max-h-full w-full max-w-[min(100%,24rem)] shrink-0 flex-col">
                {sheets}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
