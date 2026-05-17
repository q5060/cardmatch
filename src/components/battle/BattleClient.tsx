"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import {
  MeetMap,
  type MapAnnouncementPin,
  type MapShopPin,
} from "@/components/map/MeetMap";
import { MapLocationSearch } from "@/components/map/MapLocationSearch";
import type { MapFlyToTarget, MapPreviewPin } from "@/components/map/MeetMapClient";
import { MatchChat } from "@/components/battle/MatchChat";
import { ResponsiveSheet } from "@/components/battle/ResponsiveSheet";
import { ShopLobbyContent } from "@/components/battle/ShopLobbyContent";
import { AnnouncementContent } from "@/components/battle/AnnouncementContent";
import {
  PublishAnnouncementContent,
  type PublishDraft,
} from "@/components/battle/PublishAnnouncementContent";
import {
  acceptInvite,
  cancelMatch,
  rejectCancelRequest,
  finishMatch,
  rejectInvite,
  resetBattleResult,
  sendInviteFromSpot,
  setReady,
} from "@/actions/match";
import { clearBattleAnnouncement } from "@/actions/meetSpot";
import { MATCH_STATUS } from "@/lib/constants";
import type { MapAnnouncementDTO } from "@/lib/queries";

export type ActiveMatchDTO = {
  id: number;
  status: string;
  invitedById: number;
  playerAId: number;
  playerBId: number;
  playerAReady: boolean;
  playerBReady: boolean;
  cancelRequestedBy?: number | null;
  meetLat: number;
  meetLng: number;
  meetLabel: string;
  playerA: { id: number; displayName: string; avatarUrl?: string | null };
  playerB: { id: number; displayName: string; avatarUrl?: string | null };
};

export type BattleResultDTO = {
  id: string;
  matchId: number;
  winnerId: number | null;
  playerAAgreed: boolean;
  playerBAgreed: boolean;
  status: string;
} | null;

export function BattleClient({
  userId,
  shops,
  announcements,
  myAnnouncement,
  activeMatch,
  defaultLat,
  defaultLng,
  battleResult,
}: {
  userId: number;
  shops: MapShopPin[];
  announcements: MapAnnouncementDTO[];
  myAnnouncement: MapAnnouncementDTO | null;
  activeMatch: ActiveMatchDTO | null;
  defaultLat: number;
  defaultLng: number;
  battleResult?: BattleResultDTO;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"WIN" | "LOSS" | "DRAW">("WIN");
  const [addFriend, setAddFriend] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null);
  const [sheetAnnouncement, setSheetAnnouncement] =
    useState<MapAnnouncementDTO | null>(null);
  const [selectedShop, setSelectedShop] = useState<MapShopPin | null>(null);
  const [flyTo, setFlyTo] = useState<MapFlyToTarget | null>(null);
  const [previewPin, setPreviewPin] = useState<MapPreviewPin | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAttempted, setLocationAttempted] = useState(false);

  const mapPins: MapAnnouncementPin[] = useMemo(() => {
    const pins: MapAnnouncementPin[] = announcements.map((a) => ({
      spotId: a.spotId,
      userId: a.userId,
      displayName: a.displayName,
      avatarUrl: a.avatarUrl,
      lat: a.lat,
      lng: a.lng,
      label: a.label,
      isOwn: false,
    }));
    if (myAnnouncement && !myAnnouncement.shopId) {
      pins.push({
        spotId: myAnnouncement.spotId,
        userId: myAnnouncement.userId,
        displayName: myAnnouncement.displayName,
        avatarUrl: myAnnouncement.avatarUrl,
        lat: myAnnouncement.lat,
        lng: myAnnouncement.lng,
        label: myAnnouncement.label,
        isOwn: true,
      });
    }
    return pins;
  }, [announcements, myAnnouncement]);

  const announcementBySpotId = useMemo(() => {
    const map = new Map<string, MapAnnouncementDTO>();
    for (const a of announcements) map.set(a.spotId, a);
    if (myAnnouncement) map.set(myAnnouncement.spotId, myAnnouncement);
    return map;
  }, [announcements, myAnnouncement]);

  useEffect(() => {
    if (activeMatch) return;
    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [activeMatch, router]);

  /** Request user's GPS location when component mounts */
  useEffect(() => {
    if (!locationAttempted && navigator.geolocation) {
      setLocationAttempted(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setGpsLocation({ lat, lng });
          console.log("GPS定位成功:", lat, lng);
          // Fly to GPS location on map
          setFlyTo({ lat, lng, zoom: 15, key: Date.now() });
        },
        (error) => {
          console.log("GPS定位失敗:", error.message);
          // Silently fail - use default location
        }
      );
    }
  }, [locationAttempted]);

  /** Server props only refresh after your own actions; poll so the opponent's ready state & status sync. */
  useEffect(() => {
    if (!activeMatch) return;
    const syncStatuses = new Set<string>([
      MATCH_STATUS.ACCEPTED,
      MATCH_STATUS.INVITE_PENDING,
      MATCH_STATUS.IN_PROGRESS,
    ]);
    if (!syncStatuses.has(activeMatch.status)) return;

    const id = window.setInterval(() => {
      router.refresh();
    }, 2500);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll keyed by match id + status only
  }, [activeMatch?.id, activeMatch?.status, router]);

  function refresh() {
    router.refresh();
  }

  function run(action: () => Promise<unknown>) {
    setErr(null);
    startTransition(async () => {
      try {
        await action();
        refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "操作失敗");
      }
    });
  }

  const otherPlayer = activeMatch
    ? activeMatch.playerAId === userId
      ? activeMatch.playerB
      : activeMatch.playerA
    : null;

  const otherPlayerId = activeMatch
    ? activeMatch.playerAId === userId
      ? activeMatch.playerBId
      : activeMatch.playerAId
    : null;

  const iAmA = activeMatch ? activeMatch.playerAId === userId : false;
  const myReady = activeMatch
    ? iAmA
      ? activeMatch.playerAReady
      : activeMatch.playerBReady
    : false;
  const theirReady = activeMatch
    ? iAmA
      ? activeMatch.playerBReady
      : activeMatch.playerAReady
    : false;

  if (activeMatch) {
    const st = activeMatch.status;

    return (
      <div className="space-y-6">
        <div className="card card-hover p-5">
          <h2 className="text-lg font-semibold text-foreground">進行中的約戰</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            對手：
            {otherPlayerId && otherPlayer ? (
              <Link
                href={`/profile/${otherPlayerId}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {otherPlayer.displayName}
              </Link>
            ) : (
              otherPlayer?.displayName
            )}
            {" · "}
            {activeMatch.meetLabel}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            座標：{activeMatch.meetLat.toFixed(4)}, {activeMatch.meetLng.toFixed(4)}
          </p>
          {err ? (
            <p
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {err}
            </p>
          ) : null}
        </div>

        {st === MATCH_STATUS.INVITE_PENDING ? (
          <div className="card card-hover space-y-3 p-5">
            {activeMatch.invitedById === userId ? (
              <p className="text-foreground">已送出邀請，等待對方回應。</p>
            ) : (
              <>
                <p className="text-foreground">
                  {otherPlayerId && otherPlayer ? (
                    <Link
                      href={`/profile/${otherPlayerId}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {otherPlayer.displayName}
                    </Link>
                  ) : (
                    otherPlayer?.displayName
                  )}
                  邀請你約戰。
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await acceptInvite(activeMatch.id.toString());
                      })
                    }
                    className="btn btn-primary"
                  >
                    接受
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await rejectInvite(activeMatch.id.toString());
                      })
                    }
                    className="btn btn-outline border-red-200 font-semibold text-red-700 hover:bg-red-50"
                  >
                    拒絕
                  </button>
                </div>
              </>
            )}
            {activeMatch.invitedById === userId && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await cancelMatch(activeMatch.id.toString());
                  })
                }
                className="text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
              >
                取消邀請
              </button>
            )}
          </div>
        ) : null}

        {(st === MATCH_STATUS.ACCEPTED || st === MATCH_STATUS.IN_PROGRESS) && (
          <div className="grid gap-4 lg:grid-cols-2">
            <MeetMap
              shops={shops}
              announcements={[]}
              center={[activeMatch.meetLat, activeMatch.meetLng]}
              zoom={14}
              height={280}
            />
            <MatchChat matchId={activeMatch.id.toString()} currentUserId={userId} />
          </div>
        )}

        {st === MATCH_STATUS.ACCEPTED && (
          <div className="card card-hover space-y-3 p-5">
            {activeMatch.cancelRequestedBy ? (
              <>
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {activeMatch.cancelRequestedBy === userId
                    ? "你已請求取消約戰"
                    : "對方請求取消約戰"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeMatch.cancelRequestedBy !== userId && (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await cancelMatch(activeMatch.id.toString());
                          })
                        }
                        className="btn btn-primary"
                      >
                        同意取消
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await rejectCancelRequest(activeMatch.id.toString());
                          })
                        }
                        className="btn btn-outline border-red-200 text-red-700"
                      >
                        拒絕取消
                      </button>
                    </>
                  )}
                  {activeMatch.cancelRequestedBy === userId && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await cancelMatch(activeMatch.id.toString());
                        })
                      }
                      className="btn btn-outline text-xs"
                    >
                      撤回取消請求
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  雙方準備完成後將自動開始對戰。你的狀態：
                  <strong className="mx-0.5">{myReady ? "已準備" : "未準備"}</strong>
                  ，對方：
                  <strong className="mx-0.5">{theirReady ? "已準備" : "未準備"}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  對方按下準備後，此處約每 2.5 秒自動同步；仍不符時請重新整理頁面。
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await setReady(activeMatch.id.toString(), !myReady);
                      })
                    }
                    className="btn btn-primary"
                  >
                    {myReady ? "取消準備" : "我準備好了"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await cancelMatch(activeMatch.id.toString());
                      })
                    }
                    className="btn btn-outline"
                  >
                    請求取消約戰
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {st === MATCH_STATUS.IN_PROGRESS && (
          <div className="card card-hover space-y-4 p-5">
            {activeMatch.cancelRequestedBy && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-700 mb-2">
                  {activeMatch.cancelRequestedBy === userId
                    ? "你已請求取消約戰"
                    : "對方請求取消約戰"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeMatch.cancelRequestedBy !== userId && (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await cancelMatch(activeMatch.id.toString());
                          })
                        }
                        className="btn btn-sm btn-primary"
                      >
                        同意取消
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await rejectCancelRequest(activeMatch.id.toString());
                          })
                        }
                        className="btn btn-sm btn-outline border-red-200 text-red-700"
                      >
                        拒絕取消
                      </button>
                    </>
                  )}
                  {activeMatch.cancelRequestedBy === userId && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await cancelMatch(activeMatch.id.toString());
                        })
                      }
                      className="btn btn-sm btn-outline"
                    >
                      撤回取消請求
                    </button>
                  )}
                </div>
              </div>
            )}

            <h3 className="font-semibold text-foreground">選擇勝方</h3>
            {err && err.includes("不相符") && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {err}
              </p>
            )}

            {battleResult && battleResult.status === "PENDING" ? (
              // Phase 2: Result submitted by someone - show asymmetric UI
              <>
                {/* Check who submitted: if current player submitted, show waiting; else show confirmation */}
                {(iAmA ? battleResult.playerAAgreed : battleResult.playerBAgreed) ? (
                  // CURRENT PLAYER SUBMITTED - Show waiting UI (disabled)
                  <div className="space-y-4">
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      等待對方確認中...
                    </p>
                    <div className="grid gap-6 lg:grid-cols-2 opacity-50 pointer-events-none">
                      {/* 己方 */}
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-border bg-neutral-100">
                          {iAmA && activeMatch.playerA.avatarUrl ? (
                            <Image
                              src={activeMatch.playerA.avatarUrl}
                              alt=""
                              fill
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : !iAmA && activeMatch.playerB.avatarUrl ? (
                            <Image
                              src={activeMatch.playerB.avatarUrl}
                              alt=""
                              fill
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <UserRound className="h-8 w-8" strokeWidth={1.5} />
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-foreground text-sm">你</p>
                          <p className="text-xs text-muted-foreground">{iAmA ? activeMatch.playerA.displayName : activeMatch.playerB.displayName}</p>
                        </div>
                        <button
                          type="button"
                          disabled
                          className={`w-full btn btn-sm ${outcome === "WIN" ? "btn-primary" : "btn-outline"}`}
                        >
                          我獲勝
                        </button>
                      </div>

                      {/* 對方 */}
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-border bg-neutral-100">
                          {iAmA && activeMatch.playerB.avatarUrl ? (
                            <Image
                              src={activeMatch.playerB.avatarUrl}
                              alt=""
                              fill
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : !iAmA && activeMatch.playerA.avatarUrl ? (
                            <Image
                              src={activeMatch.playerA.avatarUrl}
                              alt=""
                              fill
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <UserRound className="h-8 w-8" strokeWidth={1.5} />
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-foreground text-sm">對方</p>
                          <p className="text-xs text-muted-foreground">{otherPlayer?.displayName}</p>
                        </div>
                        <button
                          type="button"
                          disabled
                          className={`w-full btn btn-sm ${outcome === "LOSS" ? "btn-primary" : "btn-outline"}`}
                        >
                          對方獲勝
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled
                      className={`w-full btn btn-sm ${outcome === "DRAW" ? "btn-primary" : "btn-outline"}`}
                    >
                      平手
                    </button>

                    <button
                      type="button"
                      disabled
                      className={`w-full btn btn-primary`}
                    >
                      送出結果
                    </button>
                  </div>
                ) : (
                  // OPPONENT SUBMITTED - Show confirmation UI
                  <div className="space-y-4">
                    <p className="text-sm text-foreground">
                      對方選擇 <strong>
                        {battleResult.winnerId === null ? "平手" : battleResult.winnerId === userId ? "你" : "他們"}
                      </strong>
                      {battleResult.winnerId !== null && <span>獲勝</span>}
                      ，是否無誤？
                    </p>

                    <div className="grid gap-3 grid-cols-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await finishMatch(activeMatch.id.toString(), battleResult.winnerId, false);
                          })
                        }
                        className="btn btn-primary btn-sm"
                      >
                        結果正確
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await resetBattleResult(activeMatch.id.toString());
                          })
                        }
                        className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                      >
                        結果錯誤
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Phase 1: No result yet - show selection UI
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* 己方 */}
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-border bg-neutral-100">
                      {iAmA && activeMatch.playerA.avatarUrl ? (
                        <Image
                          src={activeMatch.playerA.avatarUrl}
                          alt=""
                          fill
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : !iAmA && activeMatch.playerB.avatarUrl ? (
                        <Image
                          src={activeMatch.playerB.avatarUrl}
                          alt=""
                          fill
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <UserRound className="h-8 w-8" strokeWidth={1.5} />
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground text-sm">你</p>
                      <p className="text-xs text-muted-foreground">{iAmA ? activeMatch.playerA.displayName : activeMatch.playerB.displayName}</p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setOutcome("WIN")}
                      className={`w-full btn btn-sm ${outcome === "WIN" ? "btn-primary" : "btn-outline"}`}
                    >
                      我獲勝
                    </button>
                  </div>

                  {/* 對方 */}
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-border bg-neutral-100">
                      {iAmA && activeMatch.playerB.avatarUrl ? (
                        <Image
                          src={activeMatch.playerB.avatarUrl}
                          alt=""
                          fill
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : !iAmA && activeMatch.playerA.avatarUrl ? (
                        <Image
                          src={activeMatch.playerA.avatarUrl}
                          alt=""
                          fill
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <UserRound className="h-8 w-8" strokeWidth={1.5} />
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground text-sm">對方</p>
                      <p className="text-xs text-muted-foreground">{otherPlayer?.displayName}</p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setOutcome("LOSS")}
                      className={`w-full btn btn-sm ${outcome === "LOSS" ? "btn-primary" : "btn-outline"}`}
                    >
                      對方獲勝
                    </button>
                  </div>
                </div>

                {/* 平手選項 */}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setOutcome("DRAW")}
                  className={`w-full btn btn-sm ${outcome === "DRAW" ? "btn-primary" : "btn-outline"}`}
                >
                  平手
                </button>

                {/* 送出按鈕 */}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      let winnerId: number | null;
                      if (outcome === "WIN") {
                        winnerId = userId;
                      } else if (outcome === "LOSS") {
                        winnerId = iAmA ? activeMatch.playerBId : activeMatch.playerAId;
                      } else {
                        winnerId = null; // null for draw
                      }
                      await finishMatch(activeMatch.id.toString(), winnerId, false);
                    })
                  }
                  className="btn btn-primary w-full"
                >
                  送出結果
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function openPublishAt(lat: number, lng: number, label: string, shopId?: string | null) {
    setPublishDraft({ lat, lng, label, shopId });
  }

  function handleAnnouncementClick(spotId: string) {
    const ann = announcementBySpotId.get(spotId);
    if (ann) setSheetAnnouncement(ann);
  }

  return (
    <div className="space-y-6">
      <div className="card card-hover space-y-2 p-4">
        <h2 className="font-semibold text-foreground">地圖公告</h2>
        {myAnnouncement ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              公告中：
              <span className="font-medium text-foreground">{myAnnouncement.label}</span>
              {myAnnouncement.shopId ? "（卡店大廳）" : "（自選地點）"}
              {myAnnouncement.timeNote ? ` · ${myAnnouncement.timeNote}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {myAnnouncement.shopId ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const shop = shops.find((s) => s.id === myAnnouncement.shopId);
                    if (shop) setSelectedShop(shop);
                  }}
                >
                  查看大廳
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await clearBattleAnnouncement();
                  })
                }
                className="btn btn-outline btn-sm"
              >
                結束公告
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            可用上方搜尋欄找卡店或地址；點擊
            <span className="font-medium text-[#2563eb]">藍色卡店</span>
            進入店家大廳，或點擊地圖空白處發布
            <span className="font-medium text-[#16a34a]">綠色玩家釘</span>
            自選地點公告（約 4 小時後自動下架）。
          </p>
        )}
      </div>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}

      <div className="space-y-2">
        <MapLocationSearch
          shops={shops}
          onSelectShop={(shop) => {
            setPublishDraft(null);
            setSheetAnnouncement(null);
            setFlyTo({ lat: shop.lat, lng: shop.lng, zoom: 15, key: Date.now() });
            setPreviewPin(null);
            setSelectedShop(shop);
          }}
          onSelectPlace={(place) => {
            setSelectedShop(null);
            setSheetAnnouncement(null);
            setPublishDraft(null);
            setFlyTo({ lat: place.lat, lng: place.lng, zoom: 15, key: Date.now() });
            setPreviewPin(place);
          }}
        />
        {/* {previewPin ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              已選地點：<span className="font-medium text-foreground">{previewPin.label}</span>
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() =>
                openPublishAt(previewPin.lat, previewPin.lng, previewPin.label)
              }
            >
              在此發布約戰
            </button>
          </div>
        ) : null} */}

        {/* Map container with responsive layout */}
        <div className={`relative overflow-hidden rounded-lg border border-border grid transition-all duration-300 ${selectedShop || sheetAnnouncement || publishDraft ? "grid-cols-1 sm:grid-cols-[1fr_384px]" : "grid-cols-1"
          }`}>
          {/* Map */}
          <div className="w-full h-full relative z-0">
            <MeetMap
              shops={shops}
              announcements={mapPins}
              center={[gpsLocation?.lat ?? defaultLat, gpsLocation?.lng ?? defaultLng]}
              zoom={14}
              height={400}
              flyTo={flyTo}
              previewPin={previewPin}
              clickHint="可搜尋地點；藍色釘＝卡店大廳；綠色釘＝玩家自選；點空白處發布"
              onMapClick={(lat, lng) => {
                setSelectedShop(null);
                setSheetAnnouncement(null);
                setPreviewPin({ lat, lng, label: "自訂地點" });
                openPublishAt(lat, lng, "自訂地點");
              }}
              onShopClick={(shop) => {
                setPublishDraft(null);
                setSheetAnnouncement(null);
                setPreviewPin(null);
                setSelectedShop(shop);
              }}
              onAnnouncementClick={(spotId) => {
                setSelectedShop(null);
                setPublishDraft(null);
                setPreviewPin(null);
                handleAnnouncementClick(spotId);
              }}
            />
          </div>

          <ResponsiveSheet
            isOpen={!!selectedShop}
            onClose={() => setSelectedShop(null)}
            title={selectedShop?.name}
          >
            {selectedShop && (
              <ShopLobbyContent
                shop={selectedShop}
                currentUserId={userId}
                parentPending={pending}
                onSelectPlayer={(ann) => {
                  setSelectedShop(null);
                  setSheetAnnouncement(ann);
                }}
                onPublishAtShop={(shop) => {
                  setSelectedShop(null);
                  openPublishAt(shop.lat, shop.lng, shop.name, shop.id);
                }}
                onCleared={() => {
                  setSelectedShop(null);
                }}
              />
            )}
          </ResponsiveSheet>

          <ResponsiveSheet
            isOpen={!!sheetAnnouncement}
            onClose={() => setSheetAnnouncement(null)}
            title={sheetAnnouncement?.displayName}
          >
            {sheetAnnouncement && (
              <AnnouncementContent
                announcement={sheetAnnouncement}
                isOwn={sheetAnnouncement.userId === userId}
                pending={pending}
                onInvite={() => {
                  if (!sheetAnnouncement) return;
                  run(async () => {
                    await sendInviteFromSpot(sheetAnnouncement.spotId);
                    setSheetAnnouncement(null);
                  });
                }}
                onClear={() =>
                  run(async () => {
                    await clearBattleAnnouncement();
                    setSheetAnnouncement(null);
                  })
                }
              />
            )}
          </ResponsiveSheet>

          <ResponsiveSheet
            isOpen={!!publishDraft}
            onClose={() => setPublishDraft(null)}
            title="發布約戰公告"
          >
            {publishDraft && (
              <PublishAnnouncementContent
                draft={publishDraft}
                onClose={() => setPublishDraft(null)}
                onPublished={refresh}
              />
            )}
          </ResponsiveSheet>
        </div>
      </div>
    </div>
  );
}
