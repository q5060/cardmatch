"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { fetchShopLobby, clearBattleAnnouncement } from "@/actions/meetSpot";

type Props = {
  shop: MapShopPin | null;
  currentUserId: number;
  pending?: boolean;
  onClose: () => void;
  onSelectPlayer: (announcement: MapAnnouncementDTO) => void;
  onPublishAtShop: (shop: MapShopPin) => void;
  onCleared?: () => void;
};

export function ShopLobbySheet({
  shop,
  currentUserId,
  pending: parentPending,
  onClose,
  onSelectPlayer,
  onPublishAtShop,
  onCleared,
}: Props) {
  const [players, setPlayers] = useState<MapAnnouncementDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadLobby = useCallback(async () => {
    if (!shop) return;
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
    if (shop) void loadLobby();
    else setPlayers([]);
  }, [shop, loadLobby]);

  if (!shop) return null;

  const myEntry = players.find((p) => p.userId === currentUserId);
  const isBusy = pending || parentPending;

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-center bg-black/40 p-4 items-end sm:items-center sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-lobby-title"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[85vh] w-full max-w-md flex-col shadow-xl sm:mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1 border-b border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            店家大廳
          </p>
          <h2 id="shop-lobby-title" className="text-lg font-semibold text-foreground">
            {shop.name}
          </h2>
          {shop.addressNote ? (
            <p className="text-sm text-muted-foreground">{shop.addressNote}</p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {err ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {err}
            </p>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
          ) : players.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              目前沒有玩家在此店約戰
            </p>
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
                        <p className="text-xs text-muted-foreground">
                          {p.timeNote || "未填時段"}
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
                              onClose();
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

        <div className="flex flex-wrap gap-2 border-t border-border p-5">
          <button
            type="button"
            disabled={isBusy || !!myEntry}
            onClick={() => onPublishAtShop(shop)}
            className="btn btn-primary flex-1"
            title={myEntry ? "你已有此店的公告" : undefined}
          >
            {myEntry ? "你已在此店公告中" : "發布約戰公告"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-outline">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
