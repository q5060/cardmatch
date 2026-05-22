import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ProfileMatchFeedRow } from "@/lib/queries";
import { MatchFeedList } from "@/components/profile/MatchFeedList";

type Props = {
  feed: ProfileMatchFeedRow[];
  backHref: string;
  title: string;
  subtitle?: string;
};

export function ProfileMatchesPage({ feed, backHref, title, subtitle }: Props) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          返回個人檔案
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      <div className="card card-hover p-5">
        <MatchFeedList feed={feed} emptyMessage="尚無已完成對戰紀錄。" />
      </div>
    </div>
  );
}
