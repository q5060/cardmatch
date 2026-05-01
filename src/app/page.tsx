import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ArrowRight, ClipboardList, Map, UsersRound } from "lucide-react";

function MapPreview() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-100/90 to-neutral-50 px-4 py-6">
      <svg viewBox="0 0 200 120" className="h-28 w-full max-w-[200px] text-neutral-300" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          d="M20 90 Q60 20 100 60 T180 40"
        />
        <path fill="none" stroke="currentColor" strokeWidth="1" d="M30 70 L170 85 M40 40 L160 55" />
        <circle cx="100" cy="58" r="5" className="fill-primary/40 stroke-primary" strokeWidth="1.5" />
        <circle cx="72" cy="72" r="3" className="fill-neutral-400/40" />
        <circle cx="138" cy="48" r="3" className="fill-neutral-400/40" />
      </svg>
    </div>
  );
}

function QueuePreview() {
  return (
    <div className="relative flex flex-1 flex-col justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-100/90 to-neutral-50 px-5 py-5">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-9 w-9 rounded-full border-2 border-primary/30 border-t-primary animate-soft-spin"
          aria-hidden
        />
      </div>
      {["休閒標準", "輕鬆對戰", "新手友善"].map((line, i) => (
        <div
          key={line}
          className="relative rounded-lg bg-white/80 px-3 py-2 text-xs font-medium text-neutral-500 shadow-sm shadow-black/[0.04]"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
          {line}
        </div>
      ))}
    </div>
  );
}

function FriendsPreview() {
  const rows = [
    { online: true },
    { online: true },
    { online: false },
  ];
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-100/90 to-neutral-50 px-5 py-5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2.5 shadow-sm shadow-black/[0.04]">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-white" />
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${r.online ? "bg-emerald-500" : "bg-red-400"}`}
              aria-hidden
            />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-2 w-20 rounded-full bg-neutral-200" />
            <div className="h-1.5 w-28 rounded-full bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

const features = [
  {
    tag: "Map",
    labelEn: "Local Games",
    title: "地圖與地點",
    desc: "標註方便對戰的地點與時段，並查看種子卡店與大廳玩家。",
    Preview: MapPreview,
    FootIcon: Map,
  },
  {
    tag: "Queue",
    labelEn: "Active Queues",
    title: "大廳／隨機",
    desc: "從名單發送邀請，或依距離自動配對另一位玩家。",
    Preview: QueuePreview,
    FootIcon: ClipboardList,
  },
  {
    tag: "Friends",
    labelEn: "Friendly Matches",
    title: "聊天與好友",
    desc: "約戰中即時文字協調；賽後可發送好友邀請與私訊。",
    Preview: FriendsPreview,
    FootIcon: UsersRound,
  },
] as const;

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="card card-hover relative overflow-hidden px-8 py-12 sm:px-12 sm:py-14">
        <div
          className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-teal-300/10 blur-3xl"
          aria-hidden
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          PTCG 實體約戰
        </p>
        <h1 className="relative mt-4 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.65rem] md:leading-[1.15]">
          發現你的下一場對戰
        </h1>
        <p className="relative mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          輕鬆連結喜愛寶可夢卡牌的同好：在地圖上找卡店與玩家、大廳約戰或隨機配對，見面後還能聊天、加好友。
        </p>
        <div className="relative mt-10 flex flex-wrap gap-3">
          {user ? (
            <>
              <Link href="/battle" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                開始找對戰
                <ArrowRight className="h-4 w-4 opacity-95" strokeWidth={2.25} aria-hidden />
              </Link>
              <Link href="/profile" className="btn btn-outline btn-lg font-semibold">
                編輯個人檔案
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                建立帳號
                <ArrowRight className="h-4 w-4 opacity-95" strokeWidth={2.25} aria-hidden />
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg font-semibold">
                登入
              </Link>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          你能做的事
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {features.map((x) => (
            <article key={x.tag} className="card card-hover flex flex-col overflow-hidden p-6 sm:p-8">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {x.tag}
              </span>
              <div className="mt-5 min-h-[156px] flex-1">
                <x.Preview />
              </div>
              <div className="mt-8 flex gap-4 border-t border-black/[0.06] pt-8">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <x.FootIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                    {x.labelEn}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{x.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
