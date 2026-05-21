"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { fetchShopLobby, clearBattleAnnouncement } from "@/actions/meetSpot";

type Props = {
  shop: MapShopPin;
  currentUserId: number;
  parentPending?: boolean;
  onSelectPlayer: (announcement: MapAnnouncementDTO) => void;
  onPublishAtShop: (shop: MapShopPin) => void;
  onCleared?: () => void;
};

export function ShopLobbyContent({
  shop,
  currentUserId,
  parentPending,
  onSelectPlayer,
  onPublishAtShop,
  onCleared,
}: Props) {
  const [players, setPlayers] = useState<MapAnnouncementDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadLobby = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await fetchShopLobby(shop.id);
      setPlayers(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "無法載入店家大廳");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    void loadLobby();
  }, [loadLobby]);

  const myEntry = players.find((p) => p.userId === currentUserId);
  const isBusy = pending || parentPending;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="space-y-1 border-b border-border p-5">
        {/* <h2 className="text-lg font-semibold text-foreground">{shop.name}</h2> */}
        {shop.addressNote ? (
          <p className="text-sm text-muted-foreground">{shop.addressNote}</p>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {err ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {err}
          </p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">目前沒有玩家在此店約戰</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {players.map((p) => {
              const isSelf = p.userId === currentUserId;
              return (
                <li
                  key={p.spotId}
                  className="card card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100">
                      {p.avatarUrl ? (
                        <Image
                          src={p.avatarUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <UserRound className="h-5 w-5" strokeWidth={1.5} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {p.displayName}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-primary">
                            （你）
                          </span>
                        ) : null}
                      </p>
                      {p.playNote ? (
                        <p className="text-xs text-foreground line-clamp-2">{p.playNote}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {p.timeNote
                          ? `時段：${p.timeNote}`
                          : p.playNote
                            ? "未填時段"
                            : "未填說明"}
                      </p>
                    </div>
                  </div>
                  {isSelf ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await clearBattleAnnouncement();
                            onCleared?.();
                          } catch (e) {
                            setErr(e instanceof Error ? e.message : "操作失敗");
                          }
                        })
                      }
                      className="btn btn-outline btn-sm shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      結束公告
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSelectPlayer(p)}
                      className="btn btn-primary btn-sm shrink-0"
                    >
                      查看約戰
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-5">
        <button
          type="button"
          disabled={isBusy || !!myEntry}
          onClick={() => onPublishAtShop(shop)}
          className="btn btn-primary w-full"
          title={myEntry ? "你已有此店的公告" : undefined}
        >
          {myEntry ? "你已在此店公告中" : "在此店發布約戰"}
        </button>
      </div>
    </div>
  );
}
