"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FriendChat } from "@/components/friends/FriendChat";
import { acceptFriendship, rejectFriendship } from "@/actions/friends";

type Row = {
  id: string;
  status: string;
  requesterId: string;
  addresseeId: string;
  requester: { id: string; displayName: string };
  addressee: { id: string; displayName: string };
};

export function FriendsClient({
  userId,
  friendships,
}: {
  userId: string;
  friendships: Row[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = friendships.find((f) => f.id === selectedId);

  function other(f: Row) {
    return f.requesterId === userId ? f.addressee : f.requester;
  }

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const pendingIn = friendships.filter(
    (f) => f.status === "PENDING" && f.addresseeId === userId,
  );
  const pendingOut = friendships.filter(
    (f) => f.status === "PENDING" && f.requesterId === userId,
  );
  const accepted = friendships.filter((f) => f.status === "ACCEPTED");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      <aside className="card card-hover space-y-6 p-4">
        {pendingIn.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              收到的邀請
            </h3>
            <ul className="mt-2 space-y-2">
              {pendingIn.map((f) => (
                <li key={f.id} className="rounded-lg border border-border bg-gray-50/90 p-3">
                  <div className="text-sm font-medium text-foreground">{f.requester.displayName}</div>
                  <div className="mt-2 flex gap-2">
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
        ) : null}

        {pendingOut.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              送出的邀請
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {pendingOut.map((f) => (
                <li key={f.id}>{f.addressee.displayName} · 等待回應</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            好友
          </h3>
          <ul className="mt-2 space-y-1">
            {accepted.length === 0 ? (
              <li className="text-sm text-muted-foreground">尚無好友。</li>
            ) : (
              accepted.map((f) => {
                const o = other(f);
                const sel = selectedId === f.id;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        sel
                          ? "bg-primary font-semibold text-white shadow-md shadow-primary/20"
                          : "text-foreground hover:bg-black/[0.04]"
                      }`}
                    >
                      {o.displayName}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </aside>

      <section>
        {selected && selected.status === "ACCEPTED" ? (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              與 {other(selected).displayName} 的對話
            </h2>
            <FriendChat friendshipId={selected.id} currentUserId={userId} />
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
            選擇左側好友開始聊天。
          </div>
        )}
      </section>
    </div>
  );
}
