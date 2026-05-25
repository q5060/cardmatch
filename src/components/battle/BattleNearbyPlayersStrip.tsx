"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { staggerClass } from "@/lib/motion";

type Props = {
  announcements: MapAnnouncementDTO[];
  onSelect: (announcement: MapAnnouncementDTO) => void;
};

export function BattleNearbyPlayersStrip({ announcements, onSelect }: Props) {
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">附近玩家</h3>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {announcements.map((ann, index) => (
          <button
            key={ann.spotId}
            type="button"
            onClick={() => onSelect(ann)}
            className={`card card-hover flex w-[11.5rem] shrink-0 flex-col gap-2 rounded-xl p-3 text-left transition hover:border-primary/40 ${staggerClass(index)}`}
          >
            <div className="flex items-center gap-2">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100">
                {ann.avatarUrl ? (
                  <Image
                    src={ann.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <UserRound className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                )}
              </div>
              <span className="line-clamp-1 font-medium text-foreground">{ann.displayName}</span>
            </div>
            <span className="line-clamp-2 text-xs text-muted-foreground">{ann.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
