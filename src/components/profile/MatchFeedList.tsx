import Link from "next/link";
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
            <div className="mt-0.5 text-xs text-muted-foreground">
              {row.meetLabel} ·{" "}
              {new Date(row.updatedAt).toLocaleString("zh-Hant", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
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
