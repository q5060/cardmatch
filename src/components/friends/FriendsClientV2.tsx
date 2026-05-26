"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FriendsListView } from "./FriendsListView";
import { acceptFriendship, rejectFriendship } from "@/actions/friends";
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
}: {
  userId: number;
  friendships: Row[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"friends" | "pending">("friends");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

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
        const msg =
          e instanceof Error ? e.message : "操作失敗";
        setErr(msg);
      }
    });
  }

  const pendingIn = friendships.filter(
    (f) => f.status === "PENDING" && f.addresseeId === userId,
  );
  const pendingOut = friendships.filter(
    (f) => f.status === "PENDING" && f.requesterId === userId,
  );
  const accepted = friendships.filter((f) => f.status === "ACCEPTED");
  const hasPending = pendingIn.length > 0 || pendingOut.length > 0;
  const activeTab = tab === "pending" && !hasPending ? "friends" : tab;

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          onClick={() => setTab("friends")}
          data-active={activeTab === "friends"}
          className="tab-trigger relative"
        >
          好友 ({accepted.length})
        </button>
        {(pendingIn.length > 0 || pendingOut.length > 0) && (
          <button
            type="button"
            onClick={() => setTab("pending")}
            data-active={activeTab === "pending"}
            className="tab-trigger relative"
          >
            待審中 ({pendingIn.length + pendingOut.length})
            {(pendingIn.length > 0 || pendingOut.length > 0) && (
              <span className="absolute top-2 right-0 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        )}
      </div>

      {/* Friends Tab */}
      {activeTab === "friends" && (
        <section key="friends" className="motion-fade-in">
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
      {activeTab === "pending" && (
        <section key="pending" className="motion-fade-in space-y-4">
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
