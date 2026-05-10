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
  requesterId: string;
  addresseeId: string;
  requester: { id: string; displayName: string; avatarUrl?: string | null };
  addressee: { id: string; displayName: string; avatarUrl?: string | null };
  messages?: { id: string; senderId: string; body: string; createdAt: Date }[];
};

export function FriendsClientV2({
  userId,
  friendships,
}: {
  userId: string;
  friendships: Row[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "chat">("list");
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
        {/* 待處理邀請 */}
        {(pendingIn.length > 0 || pendingOut.length > 0) && (
          <section className="card card-hover space-y-4 p-6">
            <h2 className="text-lg font-semibold text-foreground">邀請</h2>

            {pendingIn.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  收到的邀請 ({pendingIn.length})
                </h3>
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
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  送出的邀請 ({pendingOut.length})
                </h3>
                <ul className="space-y-2">
                  {pendingOut.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                    >
                      <span className="text-foreground">{f.addressee.displayName}</span>
                      <span className="text-muted-foreground"> · 等待回應</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 好友列表 */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            好友 ({accepted.length})
          </h2>
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
