"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MeetMap, type MapPeerPin, type MapShopPin } from "@/components/map/MeetMap";
import { MatchChat } from "@/components/battle/MatchChat";
import {
  acceptInvite,
  cancelMatch,
  finishMatch,
  joinRandomQueue,
  leaveQueue,
  rejectInvite,
  sendLobbyInvite,
  setReady,
} from "@/actions/match";
import { MATCH_STATUS } from "@/lib/constants";

export type ActiveMatchDTO = {
  id: string;
  status: string;
  invitedById: string;
  playerAId: string;
  playerBId: string;
  playerAReady: boolean;
  playerBReady: boolean;
  meetLat: number;
  meetLng: number;
  meetLabel: string;
  playerA: { id: string; displayName: string };
  playerB: { id: string; displayName: string };
};

type LobbyPeer = MapPeerPin & { timeNote: string };

export function BattleClient({
  userId,
  shops,
  lobbyPeers,
  activeMatch,
  inQueue,
  defaultLat,
  defaultLng,
}: {
  userId: string;
  shops: MapShopPin[];
  lobbyPeers: LobbyPeer[];
  activeMatch: ActiveMatchDTO | null;
  inQueue: boolean;
  defaultLat: number;
  defaultLng: number;
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
            對手：{otherPlayer?.displayName} · {activeMatch.meetLabel}
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
                <p className="text-foreground">{otherPlayer?.displayName} 邀請你約戰。</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await acceptInvite(activeMatch.id);
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
                        await rejectInvite(activeMatch.id);
                      })
                    }
                    className="btn btn-outline border-red-200 font-semibold text-red-700 hover:bg-red-50"
                  >
                    拒絕
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await cancelMatch(activeMatch.id);
                })
              }
              className="text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
            >
              取消此約戰
            </button>
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
            <MatchChat matchId={activeMatch.id} currentUserId={userId} />
          </div>
        )}

        {st === MATCH_STATUS.ACCEPTED && (
          <div className="card card-hover space-y-3 p-5">
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
                    await setReady(activeMatch.id, !myReady);
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
                    await cancelMatch(activeMatch.id);
                  })
                }
                className="btn btn-outline"
              >
                取消約戰
              </button>
            </div>
          </div>
        )}

        {st === MATCH_STATUS.IN_PROGRESS && (
          <div className="card card-hover space-y-4 p-5">
            <h3 className="font-semibold text-foreground">結束對戰</h3>
            <p className="text-sm text-muted-foreground">
              以你的視角紀錄結果（單方紀錄 MVP）。
            </p>
            <div className="flex flex-wrap gap-2">
              {(["WIN", "LOSS", "DRAW"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={
                    outcome === o ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"
                  }
                >
                  {o === "WIN" ? "我獲勝" : o === "LOSS" ? "我落敗" : "平手"}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={addFriend}
                onChange={(e) => setAddFriend(e.target.checked)}
                className="rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
              同時向對方發送好友邀請
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await finishMatch(activeMatch.id, outcome, addFriend);
                })
              }
              className="btn btn-primary"
            >
              送出戰果並結束
            </button>
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
                <div>
                  <div className="font-medium text-foreground">{p.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.label} · {p.timeNote || "未填時段"}
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
