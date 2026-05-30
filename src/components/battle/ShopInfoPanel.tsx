"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Flag } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { ShopEventDTO } from "@/lib/queries";
import { formatEventRange } from "@/lib/format";
import {
  formatTodayHours,
  formatWeeklyHours,
  parseShopHours,
} from "@/lib/shopHours";
import { submitShopReport } from "@/actions/shops";

type Props = {
  shop: MapShopPin;
  playerCount: number;
  events: ShopEventDTO[];
  eventsLoading?: boolean;
};

export function ShopInfoPanel({ shop, playerCount, events, eventsLoading }: Props) {
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<"INCORRECT" | "CLOSED" | "OTHER">("INCORRECT");
  const [reportNote, setReportNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const hours = useMemo(() => {
    try {
      if (!shop || !shop.hoursJson) return null;
      return parseShopHours(shop.hoursJson);
    } catch (e) {
      console.error("Failed to parse shop hours:", e);
      return null;
    }
  }, [shop?.hoursJson]);

  const todayHours = hours ? formatTodayHours(hours) : null;
  const weeklyHours = hours ? formatWeeklyHours(hours) : [];
  const openNow = shop?.openNow ?? false;

  if (!shop || !shop.id) {
    return <div className="text-sm text-muted-foreground p-4">店家資訊不可用</div>;
  }

  async function handleReportSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitShopReport({ type: reportType, shopId: shop.id, note: reportNote });
      setSubmitted(true);
      setReportNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReportClose() {
    setReportOpen(false);
    setSubmitted(false);
    setError("");
    setReportNote("");
    setReportType("INCORRECT");
  }

  return (
    <div className="space-y-4 border-b border-border px-5 py-4">
      <StatusBadges openNow={openNow} playerCount={playerCount} />

      {todayHours ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{todayHours}</span>
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

      {/* 回報問題 */}
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        回報問題
      </button>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            {submitted ? (
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium text-foreground">感謝您的回報！我們會儘快確認。</p>
                <button
                  type="button"
                  onClick={handleReportClose}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white"
                >
                  關閉
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">回報店家問題</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {shop.name}
                </p>

                <div className="space-y-2">
                  {(["INCORRECT", "CLOSED", "OTHER"] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reportType"
                        value={t}
                        checked={reportType === t}
                        onChange={() => setReportType(t)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        {t === "INCORRECT" ? "此店非卡牌店（誤判）" : t === "CLOSED" ? "此店已歇業" : "其他"}
                      </span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="補充說明（選填）"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReportClose}
                    className="flex-1 rounded-lg border border-border py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {submitting ? "送出中…" : "送出"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadges({
  openNow,
  playerCount,
}: {
  openNow: boolean;
  playerCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${openNow
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
        營業時間
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
