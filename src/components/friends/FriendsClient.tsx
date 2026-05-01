"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  const [err, setErr] = useState<string | null>(null);

  const selected = friendships.find((f) => f.id === selectedId);

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
          e instanceof Error
            ? e.message === "NOT_FOUND"
              ? "找不到資料或無權限"
              : e.message === "UNAUTHORIZED"
                ? "請先登入"
                : e.message
            : "操作失敗";
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      {err ? (
        <p
          className="lg:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {err}
        </p>
      ) : null}
      <aside className="card card-hover space-y-6 p-4">
        {pendingIn.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              收到的邀請
            </h3>
            <ul className="mt-2 space-y-2">
              {pendingIn.map((f) => (
                <li key={f.id} className="rounded-lg border border-border bg-gray-50/90 p-3">
                  <Link
                    href={`/profile/${f.requester.id}`}
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {f.requester.displayName}
                  </Link>
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
                    <div
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                        sel ? "bg-primary/10 ring-1 ring-primary/25" : ""
                      }`}
                    >
                      <Link
                        href={`/profile/${o.id}`}
                        className="min-w-0 flex-1 truncate text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {o.displayName}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedId(f.id)}
                        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          sel
                            ? "bg-primary text-white shadow-sm"
                            : "bg-black/[0.06] text-foreground hover:bg-black/[0.08]"
                        }`}
                      >
                        聊天
                      </button>
                    </div>
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
              與{" "}
              <Link
                href={`/profile/${other(selected).id}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {other(selected).displayName}
              </Link>
              的對話
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
