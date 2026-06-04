"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUrlWithNext } from "@/lib/safeRedirect";
import { UserRound, ArrowLeft } from "lucide-react";
import {
  MeetMap,
  type MapAnnouncementPin,
  type MapShopPin,
} from "@/components/map/MeetMap";

import type { MapFlyToTarget, MapPreviewPin } from "@/components/map/MeetMapClient";
import { MatchChat } from "@/components/battle/MatchChat";
import { BattleMyAnnouncementBar } from "@/components/battle/BattleMyAnnouncementBar";
import { BattleExplorePanel } from "@/components/battle/BattleExplorePanel";
import { BattleRandomMatch } from "@/components/battle/BattleRandomMatch";
import { RadiusFilter } from "@/components/battle/RadiusFilter";
import { BattleShopExploreCard } from "@/components/battle/BattleShopExploreCard";
import { ResponsiveSheet } from "@/components/battle/ResponsiveSheet";
import { ShopLobbyContent } from "@/components/battle/ShopLobbyContent";
import { AnnouncementContent } from "@/components/battle/AnnouncementContent";
import { LocationNavBlock } from "@/components/ui/LocationNavBlock";
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
import { clearBattleAnnouncement, refreshShops } from "@/actions/meetSpot";
import { MATCH_STATUS } from "@/lib/constants";
import type { ActiveMatchDTO, BattleResultDTO } from "@/lib/matchDto";
import type { MapAnnouncementDTO } from "@/lib/queries";
import type { QueueStatus } from "@/actions/matchQueue";
import {
  useRealtimeConnected,
  useRealtimeEvent,
} from "@/hooks/useRealtimeEvent";
import { useMatchCeremony } from "@/hooks/useMatchCeremony";
import { BattleCeremonyOverlay } from "@/components/battle/BattleCeremonyOverlay";
import { BattleReadyStrip } from "@/components/battle/BattleReadyStrip";
import { BattleResultShareScreen } from "@/components/battle/BattleResultShareScreen";
import { MatchReportDialog } from "@/components/battle/MatchReportDialog";
import { profileMetaLine } from "@/lib/profile";
import type { MatchSharePayload } from "@/lib/matchShare";
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
  defaultShopId = null,
  initialQueueStatus = null,
  initialShopId = null,
}: {
  userId: number | null;
  shops: MapShopPin[];
  announcements: MapAnnouncementDTO[];
  myAnnouncement: MapAnnouncementDTO | null;
  activeMatch: ActiveMatchDTO | null;
  defaultLat: number;
  defaultLng: number;
  battleResult?: BattleResultDTO;
  defaultShopId?: string | null;
  initialQueueStatus?: QueueStatus | null;
  initialShopId?: string | null;
}) {
  const router = useRouter();
  const isGuest = userId === null;
  const requireLogin = useCallback(() => {
    router.push(loginUrlWithNext("/battle"));
  }, [router]);

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
  const [shopsData, setShopsData] = useState<MapShopPin[]>(shops);

  const [outcome, setOutcome] = useState<"WIN" | "LOSS" | "DRAW">("WIN");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [publishDraft, setPublishDraft] = useState<PublishDraft | null>(null);
  const [exploreTab, setExploreTab] = useState<"players" | "shops">("players");
  const [sheetAnnouncement, setSheetAnnouncement] =
    useState<MapAnnouncementDTO | null>(null);
  const [selectedShop, setSelectedShop] = useState<MapShopPin | null>(null);
  const [flyTo, setFlyTo] = useState<MapFlyToTarget | null>(null);
  const [previewPin, setPreviewPin] = useState<MapPreviewPin | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationAttemptedRef = useRef(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: defaultLat, lng: defaultLng });
  const [randomMatchCircle, setRandomMatchCircle] = useState<{ centerLat: number; centerLng: number; radiusKm: number } | null>(null);
  const [shareScreen, setShareScreen] = useState<MatchSharePayload | null>(null);
  const [matchReportOpen, setMatchReportOpen] = useState(false);
  const seenInviteMatchIdRef = useRef<number | null>(null);
  const autoCleanedRef = useRef<number | null>(null);
  const isFlyingRef = useRef(false);

  const isIncomingInvite =
    activeMatch?.status === MATCH_STATUS.INVITE_PENDING &&
    activeMatch.invitedById !== userId;

  const mapPins: MapAnnouncementPin[] = useMemo(() => {
    const pins: MapAnnouncementPin[] = announcements
      .filter((a) => !a.shopId) // Only show custom-location announcements on map, not shop-based ones
      .map((a) => ({
        spotId: a.spotId,
        userId: a.userId,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
        lat: a.lat,
        lng: a.lng,
        label: a.label,
        playNote: a.playNote || undefined,
        expiresAt: a.expiresAt,
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
        playNote: myAnnouncement.playNote || undefined,
        expiresAt: myAnnouncement.expiresAt,
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
    if (isGuest) return;
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
  }, [isGuest]);

  const syncMapSnapshot = useCallback(async () => {
    if (isGuest) return;
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
  }, [isGuest]);

  const refresh = useCallback(async () => {
    await Promise.all([syncActiveMatch(), syncMapSnapshot()]);
    // Don't auto-adjust map position - let user control it
  }, [syncActiveMatch, syncMapSnapshot]);

  const onMatchUpdated = useCallback((e: RealtimeEvent) => {
    if (e.type !== "match.updated") return;
    setActiveMatch(e.activeMatch);
    setBattleResult(e.battleResult);
  }, []);

  const onMatchCompleted = useCallback((e: RealtimeEvent) => {
    if (e.type !== "match.completed") return;
    setShareScreen(e.share);
    setActiveMatch(null);
    setBattleResult(null);
  }, []);

  useRealtimeEvent((ev) => ev.type === "match.updated", onMatchUpdated);
  useRealtimeEvent((ev) => ev.type === "match.completed", onMatchCompleted);

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
    if (!isIncomingInvite) {
      document.title = "對戰 | CardMatch";
      return;
    }
    document.title = "（新邀請）對戰 | CardMatch";
    return () => {
      document.title = "對戰 | CardMatch";
    };
  }, [isIncomingInvite]);

  /** Open a specific shop on mount (e.g. navigated from search results) */
  useEffect(() => {
    if (!initialShopId) return;
    const shop = shopsData.find((s) => s.id === initialShopId);
    if (!shop) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedShop(shop);
    setFlyTo({ lat: shop.lat, lng: shop.lng, zoom: 16, key: Date.now() });
    setMapCenter({ lat: shop.lat, lng: shop.lng });
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Request user's GPS location when component mounts */
  useEffect(() => {
    if (locationAttemptedRef.current || !navigator.geolocation) return;
    locationAttemptedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsLocation({ lat, lng });
        setMapCenter({ lat, lng });
      },
      () => {
        // Silently fail - use default location
      },
    );
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const id = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(id);
  }, [successMessage]);

  /** Auto-clear announcement when match is accepted */
  useEffect(() => {
    if (!activeMatch || activeMatch.status !== MATCH_STATUS.ACCEPTED || !myAnnouncement) return;
    // Only clear once per match
    if (autoCleanedRef.current === activeMatch?.id) return;

    autoCleanedRef.current = activeMatch?.id ?? null;
    void run(async () => {
      await clearBattleAnnouncement();
    });
  }, [activeMatch?.id, activeMatch?.status, myAnnouncement?.spotId, run]);

  const displayedRandomMatchCircle = activeMatch ? null : randomMatchCircle;

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

  // Periodically refresh shop counts (every 10 seconds)
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const updatedShops = await refreshShops();
        setShopsData(updatedShops);
      } catch (err) {
        console.error("Failed to refresh shop data:", err);
      }
    }, 10_000);

    return () => window.clearInterval(id);
  }, []);

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

  function confirmBattleResult(winnerId: number | null) {
    if (!activeMatch) return;
    setErr(null);
    startTransition(async () => {
      try {
        const result = await finishMatch(
          activeMatch.id.toString(),
          winnerId,
          false,
        );
        if (result.completed && result.share) {
          setShareScreen(result.share);
          setActiveMatch(null);
          setBattleResult(null);
        } else {
          await refresh();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "操作失敗");
      }
    });
  }

  function openPublishAt(lat: number, lng: number, label: string, shopId?: string | null) {
    if (isGuest) {
      requireLogin();
      return;
    }
    setPublishDraft({ lat, lng, label, shopId });
  }

  function handleAnnouncementClick(spotId: string) {
    const ann = announcementBySpotId.get(spotId);
    if (ann) {
      setSheetAnnouncement(ann);
      // Fly to the player's location
      isFlyingRef.current = true;
      setFlyTo({ lat: ann.lat, lng: ann.lng, zoom: 15, key: Date.now() });
      // Clear flyTo after animation completes to prevent map from being pulled back
      setTimeout(() => {
        setFlyTo(null);
        isFlyingRef.current = false;
      }, 1000);
    }
  }

  function selectShopOnMap(shop: MapShopPin) {
    setPublishDraft(null);
    setSheetAnnouncement(null);
    isFlyingRef.current = true;
    setFlyTo({ lat: shop.lat, lng: shop.lng, zoom: 15, key: Date.now() });
    // Clear flyTo after animation completes to prevent map from being pulled back
    setTimeout(() => {
      setFlyTo(null);
      isFlyingRef.current = false;
    }, 1000);
    setMapCenter({ lat: shop.lat, lng: shop.lng });
    setPreviewPin(null);
    setSelectedShop(shop);
  }

  const mapSheetOpen = !!(selectedShop || sheetAnnouncement || publishDraft);
  const mapHeight = mapSheetOpen ? 380 : 500;

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

  // Memoized callback for map center changes - must be defined at top level to follow Rules of Hooks
  const handleMapCenterChange = useCallback((lat: number, lng: number) => {
    // Ignore map center changes while flying to prevent infinite update loops
    if (isFlyingRef.current) return;

    setMapCenter(prev => {
      if (prev.lat === lat && prev.lng === lng) return prev;
      return { lat, lng };
    });
  }, []);

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

  const { ceremony, dismissCeremony } = useMatchCeremony(
    activeMatch,
    userId ?? 0,
    seenInviteMatchIdRef,
  );

  if (shareScreen && userId !== null) {
    return (
      <BattleResultShareScreen
        share={shareScreen}
        viewerId={userId}
        onDone={() => {
          setShareScreen(null);
          void refresh();
        }}
      />
    );
  }

  if (activeMatch && userId !== null) {
    const st = activeMatch.status;
    const showCeremony =
      ceremony !== null && ceremony.matchId === activeMatch.id;

    return (
      <div className="space-y-6">
        {showCeremony ? (
          <BattleCeremonyOverlay
            key={`${ceremony.matchId}-${ceremony.kind}`}
            ceremony={ceremony}
            onDismiss={dismissCeremony}
            inviteActions={
              ceremony.kind === "incoming_invite" ? (
                <>
                  <button
                    type="button"
                    data-testid="accept-invite"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await acceptInvite(activeMatch.id.toString());
                        dismissCeremony();
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
                        dismissCeremony();
                      })
                    }
                    className="btn btn-outline border-red-200 font-semibold text-red-700 hover:bg-red-50"
                  >
                    拒絕
                  </button>
                </>
              ) : undefined
            }
          />
        ) : null}

        <div key={st} className="motion-fade-in-up space-y-6">
        <div className="card card-hover p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">進行中的約戰</h2>
            {otherPlayer ? (
              <button
                type="button"
                data-testid="match-report-open"
                onClick={() => setMatchReportOpen(true)}
                className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                檢舉
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
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
            {otherPlayer && profileMetaLine(otherPlayer.gender, otherPlayer.age) ? (
              <span className="text-foreground">
                {" "}
                · {profileMetaLine(otherPlayer.gender, otherPlayer.age)}
              </span>
            ) : null}
          </p>
          <LocationNavBlock
            className="mt-3"
            label={activeMatch.meetLabel}
            lat={activeMatch.meetLat}
            lng={activeMatch.meetLng}
          />
          {err ? (
            <p className="alert-error mt-3" role="alert">
              {err}
            </p>
          ) : null}
        </div>

        {matchReportOpen && otherPlayer ? (
          <MatchReportDialog
            matchId={activeMatch.id}
            opponentName={otherPlayer.displayName}
            onClose={() => setMatchReportOpen(false)}
            onReported={() => {
              setMatchReportOpen(false);
              setActiveMatch(null);
              setBattleResult(null);
              setSuccessMessage("已送出檢舉，約戰已結束");
              void refresh();
            }}
          />
        ) : null}

        {st === MATCH_STATUS.INVITE_PENDING ? (
          <div
            id="pending-invite"
            className={`space-y-3 p-5 ${activeMatch.invitedById !== userId
                ? "rounded-xl border-2 border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                : "card card-hover"
              }`}
          >
            {activeMatch.invitedById === userId ? (
              <p className="text-foreground">已送出邀請，等待對方回應。</p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  約戰邀請
                </p>
                {otherPlayer ? (
                  <>
                    <p className="text-lg font-semibold text-foreground">
                      {otherPlayerId ? (
                        <Link
                          href={`/profile/${otherPlayerId}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {otherPlayer.displayName}
                        </Link>
                      ) : (
                        otherPlayer.displayName
                      )}
                      {profileMetaLine(otherPlayer.gender, otherPlayer.age) ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {profileMetaLine(otherPlayer.gender, otherPlayer.age)}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">邀請你約戰</p>
                  </>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-3">
                  {/* {otherPlayerId ? (
                    <Link
                      href={`/profile/${otherPlayerId}`}
                      className="btn btn-outline btn-sm"
                    >
                      查看個人檔案
                    </Link>
                  ) : null} */}
                  <button
                    type="button"
                    data-testid="accept-invite"
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
              shops={shopsData}
              announcements={[]}
              center={[activeMatch.meetLat, activeMatch.meetLng]}
              zoom={14}
              height={280}
              showLegend={false}
              onRefresh={refresh}
              meetPin={{ lat: activeMatch.meetLat, lng: activeMatch.meetLng, label: activeMatch.meetLabel }}
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
              <BattleReadyStrip
                activeMatch={activeMatch}
                userId={userId}
                myReady={myReady}
                theirReady={theirReady}
                readyButtonClassName="flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  data-testid="mark-ready"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await setReady(activeMatch.id.toString(), !myReady);
                    })
                  }
                  className={`btn btn-primary ${
                    theirReady && !myReady ? "ring-2 ring-primary/40" : ""
                  }`}
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
              </BattleReadyStrip>
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
                      對方將對戰結果選擇為 <strong>
                        {battleResult.winnerId === null ? "平手" : battleResult.winnerId === userId ? "你 " : "對方 "}
                      </strong>
                      {battleResult.winnerId !== null && <span>獲勝</span>}
                      ，是否無誤？
                    </p>

                    <div className="grid gap-3 grid-cols-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => confirmBattleResult(battleResult.winnerId)}
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
      </div>
    );
  }

  const sheetOpen = !!(selectedShop || sheetAnnouncement || publishDraft);

  const exploreSheets = (
    <>
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
            onRequireLogin={isGuest ? requireLogin : undefined}
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
            isOwn={!isGuest && sheetAnnouncement.userId === userId}
            pending={pending}
            onInvite={
              isGuest
                ? undefined
                : () => {
                    if (!sheetAnnouncement) return;
                    run(async () => {
                      await sendInviteFromSpot(sheetAnnouncement.spotId);
                      setSheetAnnouncement(null);
                    });
                  }
            }
            onClear={
              isGuest
                ? undefined
                : () =>
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
            onBrowseShops={() => { setPublishDraft(null); setExploreTab("shops"); }}
          />
        )}
      </ResponsiveSheet>
    </>
  );

  // Determine if we should show detail view on the left side
  const showDetailView = !!(selectedShop || sheetAnnouncement || publishDraft);

  // Detail view content for left sidebar (replaces shopExplore when viewing details)
  const detailView = selectedShop ? (
    <div className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4 min-h-[480px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedShop(null)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="返回列表"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-foreground truncate">{selectedShop.name}</h2>
      </div>
      <ShopLobbyContent
        shop={selectedShop}
        currentUserId={userId}
        parentPending={pending}
        onRequireLogin={isGuest ? requireLogin : undefined}
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
    </div>
  ) : sheetAnnouncement ? (
    <div className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4 min-h-[480px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSheetAnnouncement(null)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="返回列表"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-foreground truncate">{sheetAnnouncement.displayName}</h2>
      </div>
      <div className="min-h-0 overflow-y-auto">
        <AnnouncementContent
          announcement={sheetAnnouncement}
          isOwn={!isGuest && sheetAnnouncement.userId === userId}
          pending={pending}
          onInvite={
            isGuest
              ? undefined
              : () => {
                  if (!sheetAnnouncement) return;
                  run(async () => {
                    await sendInviteFromSpot(sheetAnnouncement.spotId);
                    setSheetAnnouncement(null);
                  });
                }
          }
          onClear={
            isGuest
              ? undefined
              : () =>
                  run(async () => {
                    await clearBattleAnnouncement();
                    setSheetAnnouncement(null);
                  })
          }
        />
      </div>
    </div>
  ) : publishDraft ? (
    <div className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4 min-h-[480px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPublishDraft(null)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="返回列表"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-foreground">發布約戰公告</h2>
      </div>
      <div className="min-h-0 overflow-y-auto">
        <PublishAnnouncementContent
          draft={publishDraft}
          onClose={() => setPublishDraft(null)}
          onPublished={handleAnnouncementPublished}
          onBrowseShops={() => { setPublishDraft(null); setExploreTab("shops"); }}
        />
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {myAnnouncement ? (
        <BattleMyAnnouncementBar
          announcement={myAnnouncement}
          shops={shops}
          pending={pending}
          onViewLobby={selectShopOnMap}
          onClear={() =>
            run(async () => {
              await clearBattleAnnouncement();
            })
          }
        />
      ) : null}

      {successMessage ? (
        <div
          className="alert-success motion-toast-in flex items-start justify-between gap-3"
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

      <BattleExplorePanel
        sheetOpen={sheetOpen}
        radiusFilter={
          <RadiusFilter
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
          />
        }
        matchSetup={
          !activeMatch ? (
            <BattleRandomMatch
              shops={shopsData}
              defaultShopId={defaultShopId ?? null}
              initialQueueStatus={initialQueueStatus ?? null}
              radiusKm={radiusKm}
              mapCenter={mapCenter}
              onRequireLogin={isGuest ? requireLogin : undefined}
              onQueueJoin={(center, radius) => {
                setRandomMatchCircle({ centerLat: center.lat, centerLng: center.lng, radiusKm: radius });
              }}
              onQueueLeave={() => {
                setRandomMatchCircle(null);
              }}
            />
          ) : null
        }
        shopExplore={
          <BattleShopExploreCard
            shops={shopsData}
            announcements={announcements}
            hideShopList={!!myAnnouncement}
            onSelectShop={selectShopOnMap}
            onSelectPlace={(place) => {
              setSelectedShop(null);
              setSheetAnnouncement(null);
              isFlyingRef.current = true;
              setFlyTo({ lat: place.lat, lng: place.lng, zoom: 15, key: Date.now() });
              // Clear flyTo after animation completes to prevent map from being pulled back
              setTimeout(() => {
                setFlyTo(null);
                isFlyingRef.current = false;
              }, 1000);
              setMapCenter({ lat: place.lat, lng: place.lng });
              setPreviewPin(place);
              openPublishAt(place.lat, place.lng, place.label);
            }}
            onSelectAnnouncement={(ann) => {
              setSelectedShop(null);
              setSheetAnnouncement(ann);
              // Fly to the player's location
              isFlyingRef.current = true;
              setFlyTo({ lat: ann.lat, lng: ann.lng, zoom: 15, key: Date.now() });
              // Clear flyTo after animation completes to prevent map from being pulled back
              setTimeout(() => {
                setFlyTo(null);
                isFlyingRef.current = false;
              }, 1000);
              setMapCenter({ lat: ann.lat, lng: ann.lng });
            }}
            mapCenterLat={mapCenter.lat}
            mapCenterLng={mapCenter.lng}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            activeTab={exploreTab}
            onActiveTabChange={setExploreTab}
          />
        }
        map={
          <MeetMap
            shops={shopsData}
            announcements={mapPins}
            center={[gpsLocation?.lat ?? defaultLat, gpsLocation?.lng ?? defaultLng]}
            zoom={14}
            height={mapHeight}
            fillHeight
            showLegend={false}
            flyTo={flyTo}
            previewPin={previewPin}
            radiusCircle={{ centerLat: mapCenter.lat, centerLng: mapCenter.lng, radiusKm }}
            randomMatchCircle={displayedRandomMatchCircle}
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
            onMapCenterChange={handleMapCenterChange}
            onRefresh={refresh}
            userLocation={gpsLocation}
          />
        }
        sheets={exploreSheets}
        showDetailView={showDetailView}
        detailView={detailView}
      />
    </div>
  );
}
