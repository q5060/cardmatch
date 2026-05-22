"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { formatExpiresAt } from "@/lib/format";

type Props = {
  announcement: MapAnnouncementDTO;
  isOwn: boolean;
  pending?: boolean;
  onInvite?: () => void;
  onClear?: () => void;
};

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

      {announcement.playNote ? (
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {announcement.playNote}
        </p>
      ) : null}

      {announcement.bio ? (
        <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border pt-2">
          <span className="font-medium">個人簡介：</span>
          {announcement.bio}
        </p>
      ) : null}

      {/* Expires */}
      <p className="text-xs text-muted-foreground">
        公告至 {formatExpiresAt(announcement.expiresAt)}
      </p>

      {!isOwn && onInvite ? (
        <div className="mt-auto border-t border-border pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={onInvite}
            className="btn btn-primary w-full"
          >
            {pending ? "處理中…" : "邀請對戰"}
          </button>
        </div>
      ) : null}

      {isOwn && onClear ? (
        <div className="mt-auto border-t border-border pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="btn btn-outline w-full border-red-200 text-red-700 hover:bg-red-50"
          >
            結束公告
          </button>
        </div>
      ) : null}

      {!isOwn ? (
        <p className="text-center text-xs text-muted-foreground">
          <Link
            href={`/profile/${announcement.userId}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            查看個人檔案
          </Link>
        </p>
      ) : null}
    </div>
  );
}
