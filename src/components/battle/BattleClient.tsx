"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, UserRound } from "lucide-react";
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
import type { ActiveMatchDTO, BattleResultDTO } from "@/lib/matchDto";
import type { MapAnnouncementDTO } from "@/lib/queries";
import {
  useRealtimeConnected,
  useRealtimeEvent,
} from "@/hooks/useRealtimeEvent";
import type { RealtimeEvent } from "@/lib/realtime/types";

export type { ActiveMatchDTO, BattleResultDTO };

export function BattleClient({
  userId,
  shops,
  announcements: initialAnnouncements,
  myAnnouncement: initialMyAnnouncement,
  activeMatch: initialActiveMatch,
  defaultLat,
  defaultLng,
  battleResult: initialBattleResult,
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
  const sseConnected = useRealtimeConnected();
  const [activeMatch, setActiveMatch] = useState<ActiveMatchDTO | null>(
    initialActiveMatch,
  );
  const [battleResult, setBattleResult] = useState<BattleResultDTO>(
    initialBattleResult ?? null,
  );
  const [announcements, setAnnouncements] =
    useState<MapAnnouncementDTO[]>(initialAnnouncements);
  const [myAnnouncement, setMyAnnouncement] = useState<MapAnnouncementDTO | null>(
    initialMyAnnouncement,
  );

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [incomingInviteAlert, setIncomingInviteAlert] = useState(false);
  const seenInviteMatchIdRef = useRef<number | null>(null);
  const autoCleanedRef = useRef<number | null>(null);

  const isIncomingInvite =
    activeMatch?.status === MATCH_STATUS.INVITE_PENDING &&
    activeMatch.invitedById !== userId;

  const mapPins: MapAnnouncementPin[] = useMemo(() => {
    const pins: MapAnnouncementPin[] = announcements.map((a) => ({
      spotId: a.spotId,
      userId: a.userId,
      displayName: a.displayName,
      avatarUrl: a.avatarUrl,
      lat: a.lat,
      lng: a.lng,
      label: a.label,
      timeNote: a.timeNote || undefined,
      playNote: a.playNote || undefined,
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
        timeNote: myAnnouncement.timeNote || undefined,
        playNote: myAnnouncement.playNote || undefined,
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

  const syncActiveMatch = useCallback(async () => {
    try {
      const res = await fetch("/api/matches/active");
      if (!res.ok) return;
      const data = (await res.json()) as {
        activeMatch: ActiveMatchDTO | null;
        battleResult: BattleResultDTO;
      };
      setActiveMatch(data.activeMatch);
      setBattleResult(data.battleResult);
    } catch {
      // silent
    }
  }, []);

  const syncMapSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/battle/snapshot");
      if (!res.ok) return;
      const data = (await res.json()) as {
        announcements: MapAnnouncementDTO[];
        myAnnouncement: MapAnnouncementDTO | null;
      };
      setAnnouncements(data.announcements);
      setMyAnnouncement(data.myAnnouncement);
    } catch {
      // silent
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([syncActiveMatch(), syncMapSnapshot()]);
  }, [syncActiveMatch, syncMapSnapshot]);

  const onMatchUpdated = useCallback((e: RealtimeEvent) => {
    if (e.type !== "match.updated") return;
    setActiveMatch(e.activeMatch);
    setBattleResult(e.battleResult);
  }, []);

  useRealtimeEvent((ev) => ev.type === "match.updated", onMatchUpdated);

  /** Map snapshot fallback when SSE is disconnected. */
  useEffect(() => {
    if (activeMatch || sseConnected) return;
    const ms = myAnnouncement ? 15_000 : 30_000;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncMapSnapshot();
    }, ms);
    return () => window.clearInterval(id);
  }, [activeMatch, myAnnouncement, sseConnected, syncMapSnapshot]);

  useEffect(() => {
    if (!isIncomingInvite || !activeMatch) return;
    if (seenInviteMatchIdRef.current === activeMatch.id) return;
    seenInviteMatchIdRef.current = activeMatch.id;
    setIncomingInviteAlert(true);
    requestAnimationFrame(() => {
      document.getElementById("pending-invite")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [isIncomingInvite, activeMatch?.id]);

  useEffect(() => {
    if (!isIncomingInvite) {
      document.title = "對戰 | CardMatch";
      return;
    }
    document.title = "（新邀請）對戰 | CardMatch";
    return () => {
      document.title = "對戰 | CardMatch";
    };
  }, [isIncomingInvite]);

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

  useEffect(() => {
    if (!successMessage) return;
    const id = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(id);
  }, [successMessage]);

  /** Auto-clear announcement when match is accepted */
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== MATCH_STATUS.ACCEPTED || !myAnnouncement) return;
    // Only clear once per match
    if (autoCleanedRef.current === activeMatch.id) return;
    
    autoCleanedRef.current = activeMatch.id;
    run(async () => {
      await clearBattleAnnouncement();
    });
  }, [activeMatch?.id, activeMatch?.status, myAnnouncement?.spotId]);

  function handleAnnouncementPublished(published: PublishDraft & { label: string }) {
    void refresh();
    if (published.shopId) {
      const shopName =
        shops.find((s) => s.id === published.shopId)?.name ?? published.label;
      setSuccessMessage(
        `已在「${shopName}」發布卡店公告。可點上方「查看大廳」查看等待中的玩家。`,
      );
    } else {
      setSuccessMessage(
        `已在「${published.label}」發布約戰公告（地圖綠色釘顯示自訂地點）。`,
      );
    }
  }

  /** Match state fallback when SSE is disconnected. */
  useEffect(() => {
    if (!activeMatch || sseConnected) return;
    const syncStatuses = new Set<string>([
      MATCH_STATUS.ACCEPTED,
      MATCH_STATUS.INVITE_PENDING,
      MATCH_STATUS.IN_PROGRESS,
    ]);
    if (!syncStatuses.has(activeMatch.status)) return;

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncActiveMatch();
    }, 30_000);

    return () => window.clearInterval(id);
  }, [activeMatch?.id, activeMatch?.status, sseConnected, syncActiveMatch]);

  function run(action: () => Promise<unknown>) {
    setErr(null);
    startTransition(async () => {
      try {
        await action();
        await refresh();
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
        {isIncomingInvite && incomingInviteAlert ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border-2 border-primary bg-primary/15 px-4 py-3 shadow-md ring-2 ring-primary/25"
          >
            <Bell className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">有人回應你的約戰公告</p>
              <p className="mt-0.5 text-sm text-foreground">
                {otherPlayer?.displayName ?? "玩家"} 邀請你對戰，請在下方接受或拒絕。
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setIncomingInviteAlert(false)}
              aria-label="關閉提示"
            >
              關閉
            </button>
          </div>
        ) : null}

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
          {err ? (
            <p className="alert-error mt-3" role="alert">
              {err}
            </p>
          ) : null}
        </div>

        {st === MATCH_STATUS.INVITE_PENDING ? (
          <div
            id="pending-invite"
            className={`space-y-3 p-5 ${
              activeMatch.invitedById !== userId
                ? "rounded-xl border-2 border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                : "card card-hover"
            }`}
          >
            {activeMatch.invitedById === userId ? (
              <p className="text-foreground">已送出邀請，等待對方回應。</p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  約戰公告 · 新邀請
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {otherPlayerId && otherPlayer ? (
                    <Link
                      href={`/profile/${otherPlayerId}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {otherPlayer.displayName}
                    </Link>
                  ) : (
                    otherPlayer?.displayName
                  )}
                  <span className="font-normal text-foreground"> 邀請你約戰</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  地點：
                  <span className="font-medium text-foreground">{activeMatch.meetLabel}</span>
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await acceptInvite(activeMatch.id.toString());
                      })
                    }
                    className="btn btn-primary min-w-[7rem]"
                  >
                    接受約戰
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
              onRefresh={refresh}
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
            <div className="text-sm text-muted-foreground">
              <p>
                公告中：
                <span className="font-medium text-foreground">{myAnnouncement.label}</span>
                {myAnnouncement.shopId ? "（卡店）" : "（自訂地點）"}
              </p>
              {myAnnouncement.playNote ? (
                <p className="mt-1 text-xs text-foreground line-clamp-2">
                  {myAnnouncement.playNote}
                </p>
              ) : null}
              {myAnnouncement.timeNote ? (
                <p className="mt-0.5 text-xs">時段：{myAnnouncement.timeNote}</p>
              ) : null}
              {myAnnouncement.shopId ? (
                <p className="mt-1 text-xs">
                  你正在此卡店等候對戰 · 點「查看大廳」看同店玩家
                </p>
              ) : null}
              <p className="mt-2 rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5 text-xs text-primary">
                有人從地圖邀請你時，此頁會自動顯示接受／拒絕
              </p>
            </div>
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
            自訂地點公告（預設 4 小時後自動下架）。
          </p>
        )}
      </div>

      {successMessage ? (
        <div
          className="alert-success flex items-start justify-between gap-3"
          role="status"
        >
          <p>{successMessage}</p>
          <button
            type="button"
            className="shrink-0 text-emerald-700 underline-offset-2 hover:underline"
            onClick={() => setSuccessMessage(null)}
            aria-label="關閉提示"
          >
            關閉
          </button>
        </div>
      ) : null}

      {err ? (
        <p className="alert-error" role="alert">
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
            setFlyTo({ lat: place.lat, lng: place.lng, zoom: 15, key: Date.now() });
            setPreviewPin(place);
            openPublishAt(place.lat, place.lng, place.label);
          }}
        />

        {/* Map container with responsive layout */}
        <div
          className={`card relative grid overflow-hidden p-0 transition-all duration-300 ${
            selectedShop || sheetAnnouncement || publishDraft
              ? "grid-cols-1 sm:grid-cols-[1fr_384px]"
              : "grid-cols-1"
          }`}
        >
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
              onMapClick={(lat, lng) => {
                setSelectedShop(null);
                setSheetAnnouncement(null);
                setPreviewPin({ lat, lng, label: "" });
                openPublishAt(lat, lng, "");
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
              onRefresh={refresh}
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
                onPublished={handleAnnouncementPublished}
              />
            )}
          </ResponsiveSheet>
        </div>
      </div>
    </div>
  );
}
