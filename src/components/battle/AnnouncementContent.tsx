"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import type { MapAnnouncementDTO } from "@/lib/queries";

type Props = {
  announcement: MapAnnouncementDTO;
  isOwn: boolean;
  pending?: boolean;
  onInvite?: () => void;
  onClear?: () => void;
};

function formatExpiresAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("zh-Hant", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnnouncementContent({
  announcement,
  isOwn,
  pending,
  onInvite,
  onClear,
}: Props) {
  return (
    <div className="flex flex-col h-full space-y-4 p-5">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-neutral-100">
          {announcement.avatarUrl ? (
            <Image
              src={announcement.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UserRound className="h-7 w-7" strokeWidth={1.5} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{announcement.displayName}</p>
          <p className="text-sm text-muted-foreground">{announcement.label}</p>
        </div>
      </div>

      {/* Bio */}
      {announcement.bio ? (
        <p className="text-sm text-muted-foreground line-clamp-3">{announcement.bio}</p>
      ) : null}

      {/* Time Note */}
      {announcement.timeNote ? (
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">時段：</span>
          {announcement.timeNote}
        </p>
      ) : null}

      {/* Expires */}
      <p className="text-xs text-muted-foreground">
        公告至 {formatExpiresAt(announcement.expiresAt)}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {isOwn ? (
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="btn btn-outline border-red-200 text-red-700 hover:bg-red-50 flex-1"
          >
            結束公告
          </button>
        ) : (
          <>
            <Link
              href={`/profile/${announcement.userId}`}
              className="btn btn-outline flex-1"
            >
              查看檔案
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={onInvite}
              className="btn btn-primary flex-1"
            >
              邀請對戰
            </button>
          </>
        )}
      </div>
    </div>
  );
}
