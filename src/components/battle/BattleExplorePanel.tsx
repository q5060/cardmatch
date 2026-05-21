"use client";

import type { ReactNode } from "react";

type Props = {
  matchSetup: ReactNode | null;
  shopExplore: ReactNode;
  map: ReactNode;
  sheetOpen: boolean;
  sheets: ReactNode;
  /** When true, display the detail view on the left side instead of shopExplore */
  showDetailView?: boolean;
  detailView?: ReactNode;
};

export function BattleExplorePanel({
  matchSetup,
  shopExplore,
  map,
  sheetOpen,
  sheets,
  showDetailView = false,
  detailView,
}: Props) {
  /* Two columns with fixed left sidebar height matching the list */
  return (
    <div className="grid items-stretch lg:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] auto-rows-max lg:auto-rows-[1fr]">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        {matchSetup}
        <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
          {showDetailView ? detailView : shopExplore}
        </div>
      </div>

      <div className="card relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl p-0 lg:min-h-0">
        {/* Map fills the card; overlays sit on top */}
        <div className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden lg:min-h-0">
          <div className="min-h-0 flex flex-1 flex-col">{map}</div>
          {sheetOpen && !showDetailView ? (
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
