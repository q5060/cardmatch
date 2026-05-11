"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FriendsListView } from "./FriendsListView";
import { FriendChat } from "./FriendChat";
import { acceptFriendship, rejectFriendship } from "@/actions/friends";
import { ArrowLeft } from "lucide-react";

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
  const [mode, setMode] = useState<"list" | "chat">("list");
  const [tab, setTab] = useState<"friends" | "pending">("friends");
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<string | null>(null);
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

  const selectedFriendship = friendships.find((f) => f.id === selectedFriendshipId);

  // 好友列表視圖（卡片式）
  if (mode === "list") {
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
              {(pendingIn.length > 0 || pendingOut.length > 0) && (
                <span className="absolute top-2 right-0 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          )}
        </div>

        {/* Friends Tab */}
        {tab === "friends" && (
          <section>
            <FriendsListView
              friends={accepted.map((f) => {
                const o = other(f);
                return {
                  id: f.id,
                  displayName: o.displayName,
                  avatarUrl: o.avatarUrl,
                  lastMessageAt: f.messages?.[0]?.createdAt,
                };
              })}
              onSelectFriend={(friendshipId) => {
                setSelectedFriendshipId(friendshipId);
                setMode("chat");
              }}
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
                      <span className="text-sm font-medium text-foreground">
                        {f.requester.displayName}
                      </span>
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

  // 聊天視圖
  if (mode === "chat" && selectedFriendship) {
    const other_user = other(selectedFriendship);
    return (
      <div className="flex flex-col gap-4">
        {/* 返回按鈕 */}
        <button
          onClick={() => {
            setMode("list");
            setSelectedFriendshipId(null);
          }}
          className="btn btn-ghost w-fit gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回好友列表
        </button>

        {/* 聊天室 */}
        <div className="flex-1 rounded-lg border border-border overflow-hidden">
          <FriendChat
            friendshipId={selectedFriendship.id}
            currentUserId={userId}
          />
        </div>
      </div>
    );
  }

  return null;
}
