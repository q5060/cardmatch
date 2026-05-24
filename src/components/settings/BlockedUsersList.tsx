"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface BlockedUser {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: string;
}

interface BlockedUsersListProps {
  active: boolean;
  onMessage?: (msg: { type: "success" | "error"; text: string }) => void;
}

export function BlockedUsersList({ active, onMessage }: BlockedUsersListProps) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blocks");
      if (!res.ok) throw new Error("無法載入封鎖列表");
      const data = (await res.json()) as BlockedUser[];
      setBlocked(data);
    } catch (e) {
      onMessage?.({
        type: "error",
        text: e instanceof Error ? e.message : "無法載入封鎖列表",
      });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    if (active) void fetchBlocked();
  }, [active, fetchBlocked]);

  const handleUnblock = async (userId: number) => {
    if (
      !confirm(
        "確定要解除封鎖？對方將可再次出現在大廳，你也可重新加好友或私訊。",
      )
    ) {
      return;
    }

    setUnblockingId(userId);
    try {
      const { unblockUser } = await import("@/actions/moderation");
      await unblockUser(userId);
      setBlocked((prev) => prev.filter((u) => u.id !== userId));
      onMessage?.({ type: "success", text: "已解除封鎖" });
    } catch (e) {
      onMessage?.({
        type: "error",
        text: e instanceof Error ? e.message : "解除封鎖失敗",
      });
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        你已封鎖的使用者不會出現在店家大廳，也無法加好友或私訊。可在對方檔案的「更多」選單封鎖新使用者。
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-soft-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : blocked.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="尚無封鎖的使用者" description="封鎖後會顯示在此列表" />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {blocked.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-black/[0.02] p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-neutral-100">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserCircle className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{user.displayName}</p>
                  <Link
                    href={`/profile/${user.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    查看檔案
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleUnblock(user.id)}
                disabled={unblockingId === user.id}
                className="btn btn-outline btn-sm shrink-0 disabled:opacity-50"
              >
                {unblockingId === user.id ? "處理中…" : "解除封鎖"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
