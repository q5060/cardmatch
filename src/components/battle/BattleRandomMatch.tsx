"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Shuffle } from "lucide-react";
import { joinRandomQueue, leaveRandomQueue } from "@/actions/matchQueue";
import type { QueueStatus } from "@/actions/matchQueue";
import type { MapShopPin } from "@/components/map/MeetMap";

type MatchScope = "same_shop_priority" | "global";

type Props = {
  shops: MapShopPin[];
  defaultShopId: string | null;
  initialQueueStatus: QueueStatus | null;
};

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="input-field w-full appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={label}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    </label>
  );
}

export function BattleRandomMatch({ shops, defaultShopId, initialQueueStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shopId, setShopId] = useState<string>("");
  const [matchScope, setMatchScope] = useState<MatchScope>("same_shop_priority");
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(initialQueueStatus);
  const [err, setErr] = useState<string | null>(null);

  const inQueue = queueStatus?.inQueue === true;
  const hasShop = shopId.length > 0;

  useEffect(() => {
    if (defaultShopId && shops.some((s) => s.id === defaultShopId)) {
      setShopId(defaultShopId);
    }
  }, [defaultShopId, shops]);

  useEffect(() => {
    if (!hasShop && matchScope !== "same_shop_priority") {
      setMatchScope("same_shop_priority");
    }
  }, [hasShop, matchScope]);

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

  function resolveQueueShopId(): string | null {
    if (!hasShop) return null;
    return matchScope === "same_shop_priority" ? shopId : null;
  }

  function runJoin() {
    setErr(null);
    const queueShopId = resolveQueueShopId();
    startTransition(async () => {
      try {
        const result = await joinRandomQueue({ shopId: queueShopId });
        if (result.status === "matched") {
          setQueueStatus(null);
          router.refresh();
          return;
        }
        setQueueStatus({
          inQueue: true,
          shopId: queueShopId,
          shopName: queueShopId ? shops.find((s) => s.id === queueShopId)?.name ?? null : null,
          scope: queueShopId ? "shop" : "any",
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
        <h2 className="text-base font-semibold text-foreground">配對設置</h2>
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
      <h2 className="text-base font-semibold text-foreground">配對設置</h2>

      <button
        type="button"
        disabled={pending}
        onClick={runJoin}
        className="btn btn-primary btn-block mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold"
      >
        <Shuffle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        隨機配對
      </button>

      <div className="mt-3 space-y-2">
        <SelectField
          label="配對範圍"
          value={shopId}
          disabled={pending}
          onChange={setShopId}
        >
          <option value="">全站（不限店）</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="配對方式"
          value={matchScope}
          disabled={pending || !hasShop}
          onChange={(v) => setMatchScope(v as MatchScope)}
        >
          <option value="same_shop_priority">同店優先配對</option>
          <option value="global">全站排隊（不限店別）</option>
        </SelectField>
      </div>

      {err ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
