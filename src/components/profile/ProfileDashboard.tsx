"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Swords,
  MoreHorizontal,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import type { ProfileBattleStats, ProfileMatchFeedRow, TopOpponent } from "@/lib/queries";
import { MatchFeedList } from "@/components/profile/MatchFeedList";
import { BattleTimeHistogram } from "@/components/profile/BattleTimeHistogram";
import { TopOpponentsPanel } from "@/components/profile/TopOpponentsPanel";
import { PROFILE_RECENT_MATCHES } from "@/lib/constants";

const TABS_SELF = [
  { id: "overview" as const, label: "總覽" },
  { id: "decks" as const, label: "牌組" },
  { id: "matches" as const, label: "對戰" },
];

const TABS_OTHER = [
  { id: "overview" as const, label: "總覽" },
  { id: "decks" as const, label: "牌組" },
  { id: "matches" as const, label: "對戰" },
];

export type ProfileTabId = (typeof TABS_SELF)[number]["id"];

function normalizeTab(raw: string | null, variant: "self" | "other"): ProfileTabId {
  if (variant === "other") {
    if (raw === "decks") return "decks";
    if (raw === "matches") return "matches";
    return "overview";
  }
  if (raw === "decks") return "decks";
  if (raw === "matches") return "matches";
  return "overview";
}

function heatCellClass(count: number, max: number): string {
  if (count <= 0) return "bg-neutral-200";
  const t = Math.min(count / max, 1);
  if (t <= 0.25) return "bg-primary/25";
  if (t <= 0.5) return "bg-primary/45";
  if (t <= 0.75) return "bg-primary/70";
  return "bg-primary";
}

function ActivityHeatmap({ activityByDay }: { activityByDay: Record<string, number> }) {
  const { cellsColumnMajor, max } = useMemo(() => {
    const cols = 12;
    const rows = 7;
    const totalDays = cols * rows;
    const now = new Date();
    const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const cells: { date: string; count: number }[] = [];
    let maxCount = 1;
    for (let i = 0; i < totalDays; i++) {
      const ms = endUtc - (totalDays - 1 - i) * 86400000;
      const date = new Date(ms).toISOString().slice(0, 10);
      const count = activityByDay[date] ?? 0;
      if (count > maxCount) maxCount = count;
      cells.push({ date, count });
    }
    const columnMajor: typeof cells = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        columnMajor.push(cells[c * rows + r]);
      }
    }
    return { cellsColumnMajor: columnMajor, max: maxCount };
  }, [activityByDay]);

  return (
    <div className="card card-hover p-4">
      <h3 className="text-sm font-semibold text-foreground">對戰熱度</h3>
      {/* <p className="mt-1 text-xs text-muted-foreground">最近 84 天（每日完成對戰場次）</p> */}
      <div
        className="mt-3 grid gap-1"
        style={{
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridTemplateRows: "repeat(7, minmax(0, 10px))",
          gridAutoFlow: "column",
        }}
        role="img"
        aria-label="對戰熱度"
      >
        {cellsColumnMajor.map((c) => (
          <span
            key={c.date}
            title={`${c.date}：${c.count} 場`}
            className={`min-h-[10px] rounded-sm ${heatCellClass(c.count, max)}`}
          />
        ))}
      </div>
    </div>
  );
}

export type ProfileDashboardProps = {
  variant?: "self" | "other";
  /** Tab URLs use this base (e.g. `/profile` or `/profile/[userId]`). */
  profileBasePath?: string;
  /** For viewing other's profile */
  viewedUserId?: number;
  viewerId?: number;
  friendshipStatus?: {
    id: string;
    status: string;
    requesterId: number;
  } | null;
  user: {
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    bannerUrl?: string | null;
    createdAt: string;
  };
  battleStats: ProfileBattleStats;
  battleRecordVisibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  winrateVisibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  battleRecordsHiddenReason?: string | null;
  winrateHiddenReason?: string | null;
  deckCount: number;
  publicDeckCount: number;
  recentFeed: ProfileMatchFeedRow[];
  allMatches: ProfileMatchFeedRow[];
  topOpponents: TopOpponent[];
  /** Link target for the full match history page. */
  allMatchesHref: string;
  /** Viewer has blocked the profile owner (other profile only). */
  blockedByViewer?: boolean;
  /** Either direction of block — hide friend / report / block actions. */
  interactionBlocked?: boolean;
  isAdmin?: boolean;
  decksSlot: ReactNode;
};

function ProfileDashboardInner({
  variant = "self",
  profileBasePath = "/profile",
  viewedUserId,
  viewerId,
  friendshipStatus,
  user,
  battleStats,
  battleRecordVisibility,
  winrateVisibility,
  battleRecordsHiddenReason,
  winrateHiddenReason,
  deckCount,
  publicDeckCount,
  recentFeed,
  allMatches,
  topOpponents,
  allMatchesHref,
  blockedByViewer = false,
  interactionBlocked = false,
  isAdmin = false,
  decksSlot,
}: ProfileDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = normalizeTab(searchParams.get("tab"), variant);
  const tabs = variant === "other" ? TABS_OTHER : TABS_SELF;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [modErr, setModErr] = useState<string | null>(null);
  const [modPending, startModTransition] = useTransition();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [moreMenuOpen]);

  const setTab = useCallback(
    (next: ProfileTabId) => {
      const q = new URLSearchParams(searchParams.toString());
      if (next === "overview") q.delete("tab");
      else q.set("tab", next);
      const s = q.toString();
      const path = s ? `${profileBasePath}?${s}` : profileBasePath;
      router.replace(path, { scroll: false });
    },
    [router, searchParams, profileBasePath],
  );

  const joined = useMemo(
    () =>
      new Date(user.createdAt).toLocaleDateString("zh-Hant", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [user.createdAt],
  );

  const statTiles = useMemo(() => {
    // const deckHint =
    //   variant === "other"
    //     ? publicDeckCount > 0
    //       ? "皆為公開"
    //       : undefined
    //     : `${publicDeckCount} 公開`;

    const base = [
      {
        icon: Swords,
        value: battleStats.completedTotal,
        label: "已完成對戰",
        // hint:
        //   battleStats.recordedTotal > 0
        //     ? `已紀錄戰果 ${battleStats.recordedTotal} 場`
        //     : undefined,
      },
      {
        icon: Trophy,
        value: winrateHiddenReason ? "—" : (
          battleStats.recordedTotal > 0
            ? `${battleStats.wins}-${battleStats.losses}-${battleStats.draws}`
            : "—"
        ),
        label: winrateHiddenReason 
          ? "戰果統計未公開"
          : (battleStats.recordedTotal > 0 ? "勝-敗-平" : "尚無戰果統計"),
        hint: !winrateHiddenReason && battleStats.completedWithoutResult > 0
          ? `${battleStats.completedWithoutResult} 場未紀錄戰果`
          : undefined,
      },
      {
        icon: Zap,
        value: winrateHiddenReason ? "—" : battleStats.maxWinStreak,
        label: "最大連勝",
      },
      {
        icon: Layers,
        value: deckCount,
        label: "牌組",
        // hint: deckHint,
      },
    ];

    return base;
  }, [variant, battleStats, deckCount, publicDeckCount, winrateHiddenReason]);

  // const headerBlock =
  //   variant === "other" ? (
  //     <header className="space-y-2">
        {/* <Link
          href="/friends"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          返回好友
        </Link>
        <p
          className="inline-flex rounded-lg border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary"
          role="status"
        >
          正在查看其他玩家的檔案
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {user.displayName}
          <span className="text-muted-foreground"> 的檔案</span>
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          檢視對方公開的對戰統計與牌組；頂部「我的檔案」才是你自己的設定頁。
        </p> */}
    //   </header>
    // ) : (
    //   <header className="space-y-2">
        {/* <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              我的檔案
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              個人檔案
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              管理顯示名稱、牌組與對戰統計。
            </p>
          </div>
          <Link href="/settings" className="btn btn-outline btn-sm shrink-0">
            編輯設定
          </Link>
        </div> */}
    //   </header>
    // );

  return (
      <div className="space-y-8">
        {/* {headerBlock} */}

        <div className="card card-hover overflow-hidden p-0 shadow-none">
          <div
            className="h-28 bg-cover bg-center bg-no-repeat sm:h-36"
            style={{
              backgroundImage: user.bannerUrl 
                ? `linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.47)), url(${user.bannerUrl})`
                : "linear-gradient(90deg, rgba(0, 200, 200, 0.2) 0%, rgba(0, 200, 200, 0.1) 30%, rgba(0, 200, 200, 0.3) 100%)",
            }}
            aria-hidden
          />
          <div className="relative border-t border-black/[0.04] bg-card px-4 pb-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:gap-8">
              
              {/* Avatar */}
              <div className="-mt-12 relative h-40 w-40 shrink-0 overflow-hidden rounded-xl border-4 border-card bg-neutral-100 shadow-lg ring-1 ring-black/[0.06] sm:-mt-14 sm:h-40 sm:w-40">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    width={400}
                    height={400}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <UserRound className="h-14 w-14 opacity-70" strokeWidth={1.25} />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="mt-4 min-w-0 flex-1 sm:mt-2 pb-1">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {user.displayName}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    加入於 {joined}
                  </span>
                </p>
                
                {user.bio ? (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{user.bio}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-muted-foreground">
                    {variant === "other" ? "對方尚未填寫自我介紹" : "尚未填寫自我介紹"}
                  </p>
                )}
              </div>

            {/* Friend / moderation */}
            {variant === "other" && viewedUserId && viewerId && (
              <div className="flex gap-2 relative z-10 flex-wrap items-start shrink-0 mt-6 pb-2">
                {blockedByViewer ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={modPending}
                      onClick={() => {
                        if (!confirm("確定要解除封鎖？對方將可再次出現在大廳，你也可重新加好友或私訊。")) {
                          return;
                        }
                        startModTransition(async () => {
                          try {
                            const { unblockUser } = await import("@/actions/moderation");
                            await unblockUser(viewedUserId!);
                            window.location.reload();
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "操作失敗");
                          }
                        });
                      }}
                    >
                      {modPending ? "處理中…" : "解除封鎖"}
                    </button>
                  </>
                ) : interactionBlocked ? (
                  <span className="text-sm text-muted-foreground">無法與此使用者互動</span>
                ) : (
                  <>
                    {!friendshipStatus ? (
                      <button
                        onClick={async () => {
                          try {
                            if (!viewedUserId) return;
                            const { sendFriendRequest } = await import("@/actions/profile");
                            await sendFriendRequest(viewedUserId);
                            window.location.reload();
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "操作失敗");
                          }
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        加入好友
                      </button>
                    ) : friendshipStatus.status === "PENDING" ? (
                      <>
                        {friendshipStatus.requesterId === viewerId ? (
                          <button disabled className="btn btn-secondary btn-sm">
                            待審核
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                const { acceptFriendship } = await import("@/actions/friends");
                                await acceptFriendship(friendshipStatus.id);
                                window.location.reload();
                              } catch (e) {
                                alert(e instanceof Error ? e.message : "操作失敗");
                              }
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            接受邀請
                          </button>
                        )}
                      </>
                    ) : (
                      <Link
                        href={`/chat/${friendshipStatus.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        私訊
                      </Link>
                    )}
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm inline-flex items-center gap-1"
                        aria-expanded={moreMenuOpen}
                        aria-haspopup="menu"
                        onClick={() => setMoreMenuOpen((open) => !open)}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                        更多
                      </button>
                      {moreMenuOpen ? (
                        <div
                          className="absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
                          role="menu"
                        >
                          {friendshipStatus?.status === "ACCEPTED" ? (
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setMoreMenuOpen(false);
                                if (!confirm("確定要刪除此好友？")) return;
                                void (async () => {
                                  try {
                                    const { rejectFriendship } = await import(
                                      "@/actions/friends"
                                    );
                                    await rejectFriendship(friendshipStatus.id);
                                    window.location.reload();
                                  } catch (e) {
                                    alert(e instanceof Error ? e.message : "操作失敗");
                                  }
                                })();
                              }}
                            >
                              刪除好友
                            </button>
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-black/[0.04]"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setModErr(null);
                              setReportReason("");
                              setReportOpen(true);
                            }}
                          >
                            檢舉
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={modPending}
                            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              if (
                                !confirm(
                                  "確定要封鎖此使用者？將解除好友關係、無法私訊，且雙方不會在店家大廳看到彼此的公告。",
                                )
                              ) {
                                return;
                              }
                              startModTransition(async () => {
                                try {
                                  const { blockUser } = await import("@/actions/moderation");
                                  await blockUser(viewedUserId);
                                  window.location.reload();
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : "操作失敗");
                                }
                              });
                            }}
                          >
                            封鎖
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            )}
            {reportOpen && variant === "other" && viewedUserId ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-dialog-title"
              >
                <div className="card w-full max-w-md p-5 shadow-lg">
                  <h3 id="report-dialog-title" className="text-lg font-semibold text-foreground">
                    檢舉使用者
                  </h3>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="input-field mt-3 min-h-[80px] resize-y"
                    maxLength={500}
                    placeholder="請簡述原因（選填）"
                  />
                  {modErr ? (
                    <p className="mt-2 text-sm text-red-700" role="alert">
                      {modErr}
                    </p>
                  ) : null}
                  <div className="mt-4 flex gap-2 justify-end">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={modPending}
                      onClick={() => setReportOpen(false)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={modPending}
                      onClick={() => {
                        setModErr(null);
                        startModTransition(async () => {
                          try {
                            const { reportUser } = await import("@/actions/moderation");
                            await reportUser(viewedUserId, reportReason);
                            setReportOpen(false);
                            alert("已收到檢舉，感謝回報");
                          } catch (e) {
                            setModErr(e instanceof Error ? e.message : "送出失敗");
                          }
                        });
                      }}
                    >
                      {modPending ? "送出中…" : "送出檢舉"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <nav
            className="mt-6 flex gap-1 overflow-x-auto border-b border-border sm:gap-2"
            aria-label="個人檔案分頁"
          >
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="space-y-8">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div className="space-y-6">
              <div
                className={`grid gap-3 sm:grid-cols-2 ${
                  variant === "other" ? "lg:grid-cols-3" : "lg:grid-cols-4"
                }`}
              >
                {statTiles.map(({ icon: Icon, value, label, hint }) => (
                  <div key={label} className="card card-hover flex gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
                      <div className="text-xs font-medium text-muted-foreground">{label}</div>
                      {hint ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card card-hover p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  
                  <div className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    <h2 className="text-lg font-semibold text-foreground">近期對戰</h2>
                  </div>

                  {battleStats.completedTotal > PROFILE_RECENT_MATCHES && !battleRecordsHiddenReason ? (
                    <Link
                      href={allMatchesHref}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      所有對戰
                    </Link>
                  ) : null}
                </div>

                <MatchFeedList 
                  feed={recentFeed} 
                  hiddenReason={battleRecordsHiddenReason}
                />
              </div>

              {!battleRecordsHiddenReason && topOpponents.length > 0 && (
                <TopOpponentsPanel opponents={topOpponents} />
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24">
              {!battleRecordsHiddenReason && <ActivityHeatmap activityByDay={battleStats.activityByDay} />}
              {!battleRecordsHiddenReason && (
                <BattleTimeHistogram activityByHour={battleStats.activityByHour} />
              )}
              {/* <div className="card card-hover p-4 text-xs leading-relaxed text-muted-foreground">
                <p>
                  統計中的勝敗平僅包含<strong className="text-foreground">已送出戰果</strong>
                  的對戰；熱度圖依對戰「完成」日期計算。
                </p>
              </div> */}
            </aside>
          </div>
        )}

        {tab === "decks" && <div className="space-y-6">{decksSlot}</div>}

        {tab === "matches" && (
          <div className="card card-hover p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">所有對戰</h2>
            <MatchFeedList 
              feed={allMatches} 
              hiddenReason={battleRecordsHiddenReason}
            />
          </div>
        )}

      </div>
    </div>
  );
}

export function ProfileDashboard(props: ProfileDashboardProps) {
  return (
    <Suspense fallback={null}>
      <ProfileDashboardInner {...props} />
    </Suspense>
  );
}
