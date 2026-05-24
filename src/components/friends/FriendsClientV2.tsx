"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { FriendsListView } from "./FriendsListView";
import { acceptFriendship, rejectFriendship } from "@/actions/friends";
import { unblockUser } from "@/actions/block";
import type { BlockListItem } from "@/actions/block";
import Link from "next/link";

type Row = {
  id: string;
  status: string;
  requesterId: number;
  addresseeId: number;
  requester: { id: number; displayName: string; avatarUrl?: string | null };
  addressee: { id: number; displayName: string; avatarUrl?: string | null };
  messages?: { id: string; senderId: number; body: string; createdAt: Date }[];
};

export function FriendsClientV2({
  userId,
  friendships,
  blockList: initialBlockList,
}: {
  userId: number;
  friendships: Row[];
  blockList: BlockListItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"friends" | "pending" | "blocked">("friends");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [blockList, setBlockList] = useState(initialBlockList);

  function other(f: Row) {
    return f.requesterId === userId ? f.addressee : f.requester;
  }

  function run(fn: () => Promise<void>) {
    setErr(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "操作失敗");
      }
    });
  }

  function handleUnblock(blockedId: number) {
    if (!confirm("確定要解除封鎖此用戶？")) return;
    startTransition(async () => {
      try {
        await unblockUser(blockedId);
        setBlockList((prev) => prev.filter((b) => b.blockedId !== blockedId));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "操作失敗");
      }
    });
  }

  // Auto-switch to friends tab if pending list becomes empty
  useEffect(() => {
    const pendingIn = friendships.filter(
      (f) => f.status === "PENDING" && f.addresseeId === userId,
    );
    const pendingOut = friendships.filter(
      (f) => f.status === "PENDING" && f.requesterId === userId,
    );
    
    if (tab === "pending" && pendingIn.length === 0 && pendingOut.length === 0) {
      setTab("friends");
    }
  }, [friendships, userId, tab]);

  const pendingIn = friendships.filter(
    (f) => f.status === "PENDING" && f.addresseeId === userId,
  );
  const pendingOut = friendships.filter(
    (f) => f.status === "PENDING" && f.requesterId === userId,
  );
  const accepted = friendships.filter((f) => f.status === "ACCEPTED");

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("friends")}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            tab === "friends"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          好友 ({accepted.length})
        </button>
        {(pendingIn.length > 0 || pendingOut.length > 0) && (
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors relative ${
              tab === "pending"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            待審中 ({pendingIn.length + pendingOut.length})
            <span className="absolute top-2 right-0 h-2 w-2 rounded-full bg-red-500" />
          </button>
        )}
        <button
          onClick={() => setTab("blocked")}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            tab === "blocked"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          封鎖清單{blockList.length > 0 && ` (${blockList.length})`}
        </button>
      </div>

      {/* Friends Tab */}
      {tab === "friends" && (
        <section>
          <FriendsListView
            friends={accepted.map((f) => {
              const o = other(f);
              return {
                userId: o.id,
                friendshipId: f.id,
                displayName: o.displayName,
                avatarUrl: o.avatarUrl,
                lastMessageAt: f.messages?.[0]?.createdAt,
              };
            })}
          />
        </section>
      )}

      {/* Pending Tab */}
      {tab === "pending" && (
        <section className="space-y-4">
          {pendingIn.length > 0 && (
            <div className="card card-hover space-y-3 p-6">
              <h3 className="font-semibold text-foreground">收到的邀請 ({pendingIn.length})</h3>
              <ul className="space-y-2">
                {pendingIn.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <Link 
                      href={`/profile/${f.requesterId}`} 
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors"
                    >
                      {f.requester.displayName}
                    </Link>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await acceptFriendship(f.id);
                          })
                        }
                        className="btn btn-primary btn-sm"
                      >
                        接受
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await rejectFriendship(f.id);
                          })
                        }
                        className="btn btn-outline btn-sm"
                      >
                        拒絕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingOut.length > 0 && (
            <div className="card card-hover space-y-3 p-6">
              <h3 className="font-semibold text-foreground">送出的邀請 ({pendingOut.length})</h3>
              <ul className="space-y-2">
                {pendingOut.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {f.addressee.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">等待回應</span>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await rejectFriendship(f.id);
                        })
                      }
                      className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                    >
                      撤回
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingIn.length === 0 && pendingOut.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">沒有待審的邀請</p>
            </div>
          )}
        </section>
      )}

      {/* Blocked Tab */}
      {tab === "blocked" && (
        <section>
          {blockList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">目前沒有封鎖任何用戶</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {blockList.map((b) => (
                <li
                  key={b.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                    {b.avatarUrl ? (
                      <Image
                        src={b.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <UserRound className="h-5 w-5 opacity-70" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{b.displayName}</p>
                    {b.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">備註：{b.note}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      封鎖於 {new Date(b.createdAt).toLocaleDateString("zh-Hant")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(b.blockedId)}
                    disabled={pending}
                    className="btn btn-outline btn-sm shrink-0 text-xs"
                  >
                    解除封鎖
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {err && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {err}
        </p>
      )}
    </div>
  );
}
