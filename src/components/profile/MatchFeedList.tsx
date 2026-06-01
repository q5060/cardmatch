import Link from "next/link";
import { MapPin } from "lucide-react";
import type { ProfileMatchFeedRow } from "@/lib/queries";

type Props = {
  feed: ProfileMatchFeedRow[];
  emptyMessage?: string;
  hiddenReason?: string | null;
};

export function MatchFeedList({ feed, emptyMessage = "尚無紀錄。", hiddenReason }: Props) {
  if (feed.length === 0) {
    const message = hiddenReason || emptyMessage;
    return <p className="mt-6 text-sm text-muted-foreground">{message}</p>;
  }

  const getLocationDisplay = (row: ProfileMatchFeedRow) => {
    if (row.shopName) {
      return row.shopName;
    }
    return `${row.meetLat.toFixed(4)}, ${row.meetLng.toFixed(4)}`;
  };

  const getGoogleMapsUrl = (row: ProfileMatchFeedRow) => {
    return `https://www.google.com/maps/search/${row.meetLat},${row.meetLng}`;
  };

  return (
    <ul className="mt-4 space-y-3">
      {feed.map((row) => {
        const resultHref = row.outcomeLabel
          ? `/battle/result/${row.id}`
          : null;

        return (
          <li
            key={row.id}
            className={`relative flex items-center gap-3 rounded-xl border border-border bg-black/[0.02] px-4 py-3 ${
              resultHref ? "transition-colors hover:border-primary/25 hover:bg-primary/[0.04]" : ""
            }`}
          >
            {resultHref ? (
              <Link
                href={resultHref}
                className="absolute inset-0 z-0 rounded-xl"
                aria-label={`查看對戰結果：vs ${row.otherDisplayName}`}
              />
            ) : null}
            <div
              className={`relative z-[1] flex min-w-0 flex-1 items-center gap-3 ${
                resultHref ? "pointer-events-none" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">
                  vs{" "}
                  <Link
                    href={`/profile/${row.otherUserId}`}
                    className="pointer-events-auto text-primary underline-offset-2 hover:underline"
                  >
                    {row.otherDisplayName}
                  </Link>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <a
                    href={getGoogleMapsUrl(row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                  >
                    <MapPin className="h-3 w-3" strokeWidth={2} aria-hidden />
                    {getLocationDisplay(row)}
                  </a>
                  <span>·</span>
                  <span>
                    {new Date(row.updatedAt).toLocaleString("zh-Hant", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
              {row.outcomeLabel ? (
                <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                  {row.outcomeLabel}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">未紀錄</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
