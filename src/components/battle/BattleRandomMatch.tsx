"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shuffle } from "lucide-react";
import { joinRandomQueue, leaveRandomQueue } from "@/actions/matchQueue";
import type { QueueStatus } from "@/actions/matchQueue";
import type { MapShopPin } from "@/components/map/MeetMap";

type Props = {
  shops: MapShopPin[];
  defaultShopId: string | null;
  initialQueueStatus: QueueStatus | null;
  radiusKm?: number;
};

export function BattleRandomMatch({ shops, defaultShopId, initialQueueStatus, radiusKm = 5 }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(initialQueueStatus);
  const [err, setErr] = useState<string | null>(null);

  const inQueue = queueStatus?.inQueue === true;

  useEffect(() => {
    if (!inQueue) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/battle/queue");
        if (!res.ok) return;
        const raw: unknown = await res.json();
        if (raw === null || typeof raw !== "object" || !("inQueue" in raw)) return;
        if (raw.inQueue === false) {
          setQueueStatus(null);
          return;
        }
        if (raw.inQueue === true) {
          setQueueStatus(raw as QueueStatus);
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [inQueue]);

  function runJoin() {
    setErr(null);
    startTransition(async () => {
      try {
        const result = await joinRandomQueue({ shopId: null });
        if (result.status === "matched") {
          setQueueStatus(null);
          router.refresh();
          return;
        }
        setQueueStatus({
          inQueue: true,
          shopId: null,
          shopName: null,
          scope: "any",
          joinedAt: new Date().toISOString(),
        });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "排隊失敗");
      }
    });
  }

  function runLeave() {
    setErr(null);
    startTransition(async () => {
      try {
        await leaveRandomQueue();
        setQueueStatus(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "取消失敗");
      }
    });
  }

  if (inQueue) {
    return (
      <div className="card rounded-2xl p-4" role="status" aria-live="polite">
        <h2 className="text-base font-semibold text-foreground">隨機配對</h2>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">搜尋對手中…</p>
            <p className="text-xs text-muted-foreground">
              {queueStatus.shopName ?? (queueStatus.scope === "any" ? "全站" : "")}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={runLeave}
            className="btn btn-outline btn-sm shrink-0"
          >
            取消
          </button>
        </div>
        {err ? (
          <p className="mt-3 text-xs text-red-700" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card rounded-2xl p-4">
      <h2 className="text-base font-semibold text-foreground">隨機配對</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        在篩選範圍內隨機配對對手
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={runJoin}
        className="btn btn-primary btn-block mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold"
      >
        <Shuffle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        隨機配對
      </button>

      {err ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
