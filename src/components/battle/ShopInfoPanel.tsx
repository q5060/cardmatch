"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { ShopEventDTO } from "@/lib/queries";
import { formatEventRange } from "@/lib/format";
import {
  formatTodayHours,
  formatWeeklyHours,
  parseShopHours,
} from "@/lib/shopHours";

type Props = {
  shop: MapShopPin;
  playerCount: number;
  events: ShopEventDTO[];
  eventsLoading?: boolean;
};

export function ShopInfoPanel({ shop, playerCount, events, eventsLoading }: Props) {
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const hours = useMemo(
    () => (shop.hoursJson ? parseShopHours(shop.hoursJson) : null),
    [shop.hoursJson],
  );

  const todayHours = hours ? formatTodayHours(hours) : null;
  const weeklyHours = hours ? formatWeeklyHours(hours) : [];

  const openNow = shop.openNow ?? false;
  const hasBattleArea = shop.hasPtcgBattleArea ?? false;

  return (
    <div className="space-y-4 border-b border-border px-5 py-4">
      <StatusBadges openNow={openNow} hasBattleArea={hasBattleArea} playerCount={playerCount} />

      {todayHours ? (
        <p className="text-sm text-muted-foreground">
          今日 <span className="font-medium text-foreground">{todayHours}</span>
        </p>
      ) : null}

      {weeklyHours.length > 0 ? (
        <WeeklyHoursSection
          expanded={hoursExpanded}
          onToggle={() => setHoursExpanded((v) => !v)}
          weeklyHours={weeklyHours}
        />
      ) : null}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          近期活動
        </h3>
        {eventsLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">載入中…</p>
        ) : events.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">近期無活動</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-border/80 bg-black/[0.02] px-3 py-2.5"
              >
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatEventRange(event.startsAt, event.endsAt)}
                </p>
                {event.description ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadges({
  openNow,
  hasBattleArea,
  playerCount,
}: {
  openNow: boolean;
  hasBattleArea: boolean;
  playerCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          openNow
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
            : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${openNow ? "bg-emerald-500" : "bg-neutral-400"}`}
          aria-hidden
        />
        {openNow ? "營業中" : "休息中"}
      </span>
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
          hasBattleArea
            ? "bg-primary/10 text-primary ring-primary/20"
            : "bg-neutral-100 text-neutral-600 ring-neutral-200"
        }`}
      >
        {hasBattleArea ? "PTCG 對戰區" : "無對戰區"}
      </span>
      <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
        {playerCount} 人在店
      </span>
    </div>
  );
}

function WeeklyHoursSection({
  expanded,
  onToggle,
  weeklyHours,
}: {
  expanded: boolean;
  onToggle: () => void;
  weeklyHours: { day: string; label: string }[];
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
      >
        一週營業時間
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </button>
      {expanded ? (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {weeklyHours.map((row) => (
            <li key={row.day} className="flex justify-between gap-4">
              <span>{row.day}</span>
              <span className={row.label === "休息" ? "text-neutral-400" : "text-foreground"}>
                {row.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
