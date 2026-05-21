"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import type { MapAnnouncementDTO } from "@/lib/queries";

type Props = {
  announcements: MapAnnouncementDTO[];
  onSelect: (announcement: MapAnnouncementDTO) => void;
};

export function BattleNearbyPlayersList({ announcements, onSelect }: Props) {
  return (
    <ul
      className="min-h-[352px] space-y-2 overflow-y-auto overscroll-contain pr-0.5"
      role="list"
      style={{ minHeight: "calc(3 * 110px + 16px)" }} // 3 items * ~110px each + gaps
    >
      {announcements.map((ann) => (
        <li key={ann.spotId}>
          <button
            type="button"
            onClick={() => onSelect(ann)}
            className="flex w-full items-start gap-3 rounded-xl border border-border/80 bg-card p-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.03]"
          >
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
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">{ann.displayName}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ann.label}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
