import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getHomeAnnouncementStats } from "@/lib/queries";
import {
  ArrowRight,
  ClipboardList,
  Map,
  MapPin,
  Megaphone,
  UsersRound,
} from "lucide-react";

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
      {["隨機配對", "公開大廳－店家", "公開大廳－自訂地點"].map((line, i) => (
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
    tag: "Battles",
    labelEn: "Matches",
    title: "找到你的下一場對戰",
    desc: "在地圖上的店家或任意地點發布約戰公告，並且看到其他玩家的公告。",
    Preview: MapPreview,
    FootIcon: Map,
  },
  {
    tag: "Modes",
    labelEn: "Announcements",
    title: "隨機配對＆公開大廳",
    desc: "加入隨機配對或公開大廳，用你喜歡的方式開啟對戰。",
    Preview: QueuePreview,
    FootIcon: ClipboardList,
  },
  {
    tag: "Friends",
    labelEn: "Social",
    title: "聊天與好友",
    desc: "對戰成立後透過聊天室聯絡，賽後還可加好友維繫關係。",
    Preview: FriendsPreview,
    FootIcon: UsersRound,
  },
] as const;

const howItWorksSteps = [
  {
    step: "1",
    title: "探索地圖與卡店",
    desc: "進入對戰頁，瀏覽卡店與玩家的約戰公告，或搜尋你想打牌的地點。",
  },
  {
    step: "2",
    title: "發布公告或隨機配對",
    desc: "在店家或自訂地點發布約戰公告，或使用隨機配對尋找對手。",
  },
  {
    step: "3",
    title: "接受邀請、聊天會面",
    desc: "對方接受後可在站內聊天協調確切地點及預計抵達時間，並一鍵開啟地圖導航前往會面點。",
  },
  {
    step: "4",
    title: "賽後登記戰績、加好友",
    desc: "對戰結束後雙方確認結果，戰績會記錄在個人檔案，還能加好友保持聯繫。",
  },
] as const;

export default async function Home() {
  const user = await getCurrentUser();
  const { playerCount, recent } = await getHomeAnnouncementStats(3);

  return (
    <div className="space-y-10 sm:space-y-14">
      <div className="space-y-4 sm:space-y-5">
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
          立即開始你的下一場對戰
        </h1>
        <p className="relative mt-5 max-w-5xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          找不到可以一起對戰的牌友嗎？CardMatch 讓你輕鬆連結喜愛寶可夢卡牌的同好。<br />
          在任何地方發布約戰公告或從他人的公告發起對戰，還能加好友、聊天！
        </p>
        <div className="relative mt-10">
          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <Link href="/battle" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                  開始找對戰
                  <ArrowRight className="h-4 w-4 opacity-95" strokeWidth={2.25} aria-hidden />
                </Link>
                <Link href="/profile" className="btn btn-outline btn-lg font-semibold">
                  查看個人檔案
                </Link>
              </>
            ) : (
              <>
                <Link href="/battle" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                  探索對戰地圖
                  <ArrowRight className="h-4 w-4 opacity-95" strokeWidth={2.25} aria-hidden />
                </Link>
                <Link href="/register" className="btn btn-outline btn-lg font-semibold">
                  建立帳號
                </Link>
                <p className="self-center text-sm text-muted-foreground">
                  已經有帳號了嗎？{" "}
                  <Link href="/login" className="link-secondary font-medium">
                    點此登入
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="card card-hover p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              即時動態
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
              <Megaphone className="h-7 w-7 text-primary" strokeWidth={1.75} aria-hidden />
              {playerCount}
              <span className="text-base font-semibold text-muted-foreground sm:text-lg">
                位玩家正在公告約戰
              </span>
            </p>
          </div>
          <Link href="/battle" className="btn btn-outline btn-sm font-semibold shrink-0">
            查看地圖
          </Link>
        </div>

        {recent.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-black/[0.06] pt-4">
            {recent.map((item) => (
              <li
                key={item.userId}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-neutral-50/80 px-4 py-3 text-sm"
              >
                <Link
                  href={`/profile/${item.userId}`}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {item.displayName}
                </Link>
                <span className="text-muted-foreground">於</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {item.label || "未命名地點"}
                </span>
                <span className="text-muted-foreground">發布約戰</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-black/[0.06] pt-4 text-sm text-muted-foreground">
            目前尚無進行中的約戰公告，
            {user ? (
              <>
                {" "}
                <Link href="/battle" className="font-medium text-primary underline-offset-2 hover:underline">
                  前往對戰頁
                </Link>
                發布第一則吧！
              </>
            ) : (
              <>
                {" "}
                <Link href="/battle" className="font-medium text-primary underline-offset-2 hover:underline">
                  探索對戰地圖
                </Link>
                查看有哪些卡店或約戰地點。
              </>
            )}
          </p>
        )}
      </section>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          在 CardMatch 你可以...
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

      <section className="pb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          如何使用
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((item) => (
            <li key={item.step} className="card card-hover relative p-5 sm:p-6">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary"
                aria-hidden
              >
                {item.step}
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </li>
          ))}
        </ol>
        {!user ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/battle" className="btn btn-primary inline-flex items-center gap-2">
              探索對戰地圖
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </Link>
            <Link href="/register" className="btn btn-outline font-semibold">
              立即註冊
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
