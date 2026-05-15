"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { MeetMap, type MapPeerPin, type MapShopPin } from "@/components/map/MeetMap";
import { MatchChat } from "@/components/battle/MatchChat";
import {
  acceptInvite,
  cancelMatch,
  rejectCancelRequest,
  finishMatch,
  joinRandomQueue,
  leaveQueue,
  rejectInvite,
  resetBattleResult,
  sendLobbyInvite,
  setReady,
} from "@/actions/match";
import { MATCH_STATUS } from "@/lib/constants";

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

type LobbyPeer = MapPeerPin & { timeNote: string };

export function BattleClient({
  userId,
  shops,
  lobbyPeers,
  activeMatch,
  inQueue,
  defaultLat,
  defaultLng,
  battleResult,
}: {
  userId: number;
  shops: MapShopPin[];
  lobbyPeers: LobbyPeer[];
  activeMatch: ActiveMatchDTO | null;
  inQueue: boolean;
  defaultLat: number;
  defaultLng: number;
  battleResult?: BattleResultDTO;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"map" | "list">("map");
  const [radius, setRadius] = useState(5);
  const [outcome, setOutcome] = useState<"WIN" | "LOSS" | "DRAW">("WIN");
  const [addFriend, setAddFriend] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const peers: MapPeerPin[] = useMemo(
    () =>
      lobbyPeers.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        lat: p.lat,
        lng: p.lng,
        label: p.label,
      })),
    [lobbyPeers],
  );

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
              peers={[]}
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

  return (
    <div className="space-y-6">
      <div className="card flex gap-1 p-1">
        <button
          type="button"
          onClick={() => setTab("map")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            tab === "map"
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-black/[0.04]"
          }`}
        >
          地圖
        </button>
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            tab === "list"
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-black/[0.04]"
          }`}
        >
          名單
        </button>
      </div>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}

      {tab === "map" ? (
        <MeetMap
          shops={shops}
          peers={peers}
          center={[defaultLat, defaultLng]}
          zoom={12}
          height={360}
        />
      ) : (
        <ul className="space-y-3">
          {lobbyPeers.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border bg-card/80 px-4 py-8 text-center text-sm text-muted-foreground">
              大廳目前沒有其他公開的玩家，或你尚未公開自己的地點。
            </li>
          ) : (
            lobbyPeers.map((p) => (
              <li
                key={p.userId}
                className="card card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Link
                    href={`/profile/${p.userId}`}
                    className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100"
                    aria-label={`${p.displayName} 的個人檔案`}
                  >
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
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${p.userId}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {p.displayName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {p.label} · {p.timeNote || "未填時段"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await sendLobbyInvite(p.userId);
                    })
                  }
                  className="btn btn-primary shrink-0"
                >
                  發送約戰邀請
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <section className="card card-hover space-y-3 p-5">
        <h3 className="font-semibold text-foreground">隨機匹配</h3>
        <p className="text-sm text-muted-foreground">
          以你個人檔案中最新的約戰座標為中心，與半徑內同時排隊的玩家配對。
        </p>
        <label className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          <span>搜尋半徑（公里）</span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="input-field w-auto py-1.5 pl-2 pr-8 text-sm"
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await joinRandomQueue(defaultLat, defaultLng, radius);
              })
            }
            className="btn btn-primary"
          >
            {inQueue ? "更新排隊位置" : "加入隨機排隊"}
          </button>
          {inQueue ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await leaveQueue();
                })
              }
              className="btn btn-outline"
            >
              離開排隊
            </button>
          ) : null}
        </div>
        {inQueue ? (
          <p className="rounded-lg bg-[var(--success-bg)] px-3 py-2 text-xs font-medium text-[var(--success-fg)]">
            你在隨機排隊中，配對成功會自動建立約戰。
          </p>
        ) : null}
      </section>
    </div>
  );
}
