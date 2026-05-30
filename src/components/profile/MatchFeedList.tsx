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
      {feed.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-black/[0.02] px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground">
              vs{" "}
              <Link
                href={`/profile/${row.otherUserId}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {row.otherDisplayName}
              </Link>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-1">
              <a
                href={getGoogleMapsUrl(row)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
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
        </li>
      ))}
    </ul>
  );
}
