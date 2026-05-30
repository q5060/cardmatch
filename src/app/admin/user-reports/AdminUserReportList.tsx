"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { suspendUser, unsuspendUser } from "@/actions/admin";

type UserRow = {
  id: number;
  displayName: string;
  email: string;
  createdAt: Date;
  suspendedUntil: Date | null;
};

export function AdminUserReportList({
  rows,
}: {
  rows: { count: number; user: UserRow }[];
}) {
  return (
    <ul className="space-y-3">
      {rows.map(({ count, user }) => (
        <UserReportCard key={user.id} user={user} reportCount={count} />
      ))}
    </ul>
  );
}

function UserReportCard({
  user,
  reportCount,
}: {
  user: UserRow;
  reportCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

  return (
    <li className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{user.displayName}</span>
            <span className="text-xs text-muted-foreground">({user.email})</span>
            {isSuspended && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200" suppressHydrationWarning>
                停權至 {new Date(user.suspendedUntil!).toLocaleDateString("zh-TW")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            收到 <span className="font-semibold text-foreground">{reportCount}</span> 件檢舉
            ・註冊 {new Date(user.createdAt).toLocaleDateString("zh-TW")}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            href={`/profile/${user.id}`}
            className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
          >
            查看檔案
          </Link>
          {isSuspended ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => { await unsuspendUser(user.id); })}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              解除停權
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSuspendOpen((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            >
              停權
            </button>
          )}
        </div>
      </div>

      {suspendOpen && !isSuspended && (
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-muted-foreground shrink-0">停權天數：</label>
          <input
            type="number"
            value={suspendDays}
            min={1}
            max={365}
            onChange={(e) => setSuspendDays(Number(e.target.value))}
            className="w-20 rounded-lg border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await suspendUser(user.id, suspendDays);
                setSuspendOpen(false);
              })
            }
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            確認停權
          </button>
          <button
            type="button"
            onClick={() => setSuspendOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            取消
          </button>
        </div>
      )}
    </li>
  );
}
